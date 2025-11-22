// src/lib/config/quill/quill-config.ts

export async function setupQuillEditor(editorElement: HTMLDivElement) {
  // Import Quill
  const Quill = (await import('quill')).default;
  
  // Fix for bullet list issue - custom list classes
  const ListContainer = Quill.import('formats/list-container');
  const ListItem = Quill.import('formats/list');
  
  class MyListContainer extends ListContainer {
    static tagName = ["OL", "UL"];
    static defaultTag = "OL";

    static create(value: string) {
      return document.createElement(this.getTag(value));
    }

    static getTag(val: string) {
      // Our "ql-list" values are "bullet" and "ordered"
      const map: { [key: string]: string } = {
        bullet: "UL",
        ordered: "OL",
      };
      return map[val] || this.defaultTag;
    }

    checkMerge() {
      // Only merge if the next list is the same type as this one
      return (
        super.checkMerge() &&
        this.domNode.tagName === this.next.domNode.tagName
      );
    }
  }

  class MyListItem extends ListItem {
    static requiredContainer = MyListContainer;

    static register() {
      Quill.register(MyListContainer, true);
    }

    optimize(context: any) {
      if (
        this.statics.requiredContainer &&
        !(this.parent instanceof this.statics.requiredContainer)
      ) {
        // Insert the format value (bullet, ordered) into wrap arguments
        this.wrap(
          this.statics.requiredContainer.blotName,
          MyListItem.formats(this.domNode)
        );
      }
      super.optimize(context);
    }

    format(name: string, value: any) {
      // If the list type is different, wrap this list item in a new MyListContainer of that type
      if (
        name === ListItem.blotName &&
        value !== MyListItem.formats(this.domNode)
      ) {
        this.wrap(this.statics.requiredContainer.blotName, value);
      }
      super.format(name, value);
    }
  }

  // Register the custom list formats
  Quill.register(MyListContainer, true);
  Quill.register(MyListItem, true);
  
  // Create Quill instance
  const quill = new Quill(editorElement, {
    theme: 'snow',
    placeholder: 'Start typing your notes here...',
    modules: {
      toolbar: {
        container: [
          // First row - Block formats and text formatting
          [{ 'header': [false, 1, 2, 3] }], // Normal first, then H1, H2, H3
          ['bold', 'italic', 'underline'],
          
          // Second row - Lists and indentation  
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          
          // Third row - Structure and links
          ['blockquote', 'code-block'],
          ['link'],
          ['clean']
        ],
        handlers: {
          'list': function(value: string) {
            console.log('List handler called with value:', value);
            const range = this.quill.getSelection();
            if (range) {
              this.quill.formatLine(range.index, range.length, 'list', value || false);
              
              // Log what actually got applied
              setTimeout(() => {
                const format = this.quill.getFormat(range);
                console.log('Applied format:', format);
                console.log('DOM at range:', this.quill.getLine(range.index)[0].domNode);
              }, 10);
            }
          }
        }
      },
      keyboard: {
        bindings: {
          tab: {
            key: 9,
            handler: function(range: any, context: any) {
              // If we're in a list, indent the list item
              if (context.format.list) {
                this.quill.format('indent', '+1');
                return false;
              }
              // Otherwise, default tab behavior (insert tab or move focus)
              return true;
            }
          },
          'shift tab': {
            key: 9,
            shiftKey: true,
            handler: function(range: any, context: any) {
              // If we're in a list, outdent the list item
              if (context.format.list) {
                this.quill.format('indent', '-1');
                return false;
              }
              return true;
            }
          }
        }
      }
    },
    formats: [
      'header',
      'bold', 'italic', 'underline',
      'list', 'indent',
      'blockquote', 'code-block',
      'link'
    ]
  });
  
  // Setup UI customizations and focus after Quill is ready
  setTimeout(() => {
    customizeHeaderLabels(editorElement);
    // Auto-focus the editor
    quill.focus();
  }, 100);
  
  return quill;
}

function customizeHeaderLabels(editorElement: HTMLDivElement) {
  // Customize header dropdown to show "Normal" instead of default text
  const headerPicker = editorElement.querySelector('.ql-header .ql-picker-options');
  if (!headerPicker) return;
  
  const options = headerPicker.querySelectorAll('.ql-picker-item');
  options.forEach((option: Element) => {
    const headerValue = option.getAttribute('data-value');
    if (headerValue === '' || headerValue === null) {
      option.textContent = 'Normal';
    }
  });
}