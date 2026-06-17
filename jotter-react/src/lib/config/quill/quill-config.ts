/* eslint-disable @typescript-eslint/no-explicit-any */
// Ported from the Svelte app (src/lib/config/quill/quill-config.ts), framework-neutral.
// Quill internals are loosely typed, hence the file-level any allowance.
import Quill from 'quill';

export function setupQuillEditor(editorElement: HTMLDivElement): Quill {
  // Fix for bullet list issue - custom list classes
  const ListContainer = Quill.import('formats/list-container') as any;
  const ListItem = Quill.import('formats/list') as any;

  class MyListContainer extends ListContainer {
    static tagName = ['OL', 'UL'];
    static defaultTag = 'OL';

    static create(value: string) {
      return document.createElement(this.getTag(value));
    }

    static getTag(val: string) {
      // Our "ql-list" values are "bullet" and "ordered"
      const map: { [key: string]: string } = {
        bullet: 'UL',
        ordered: 'OL'
      };
      return map[val] || this.defaultTag;
    }

    checkMerge() {
      // Only merge if the next list is the same type as this one
      return super.checkMerge() && this.domNode.tagName === this.next.domNode.tagName;
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
        this.wrap(this.statics.requiredContainer.blotName, MyListItem.formats(this.domNode));
      }
      super.optimize(context);
    }

    format(name: string, value: any) {
      if (name === ListItem.blotName && value !== MyListItem.formats(this.domNode)) {
        this.wrap(this.statics.requiredContainer.blotName, value);
      }
      super.format(name, value);
    }
  }

  Quill.register(MyListContainer, true);
  Quill.register(MyListItem, true);

  const quill = new Quill(editorElement, {
    theme: 'snow',
    placeholder: 'Start typing your notes here...',
    modules: {
      toolbar: {
        container: [
          [{ header: [false, 1, 2, 3] }], // Normal first, then H1, H2, H3
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['blockquote', 'code-block'],
          ['link'],
          ['clean']
        ],
        handlers: {
          list: function (this: any, value: string) {
            const range = this.quill.getSelection();
            if (range) {
              this.quill.formatLine(range.index, range.length, 'list', value || false);
            }
          }
        }
      },
      keyboard: {
        bindings: {
          tab: {
            key: 9,
            handler: function (this: any, _range: any, context: any) {
              if (context.format.list) {
                this.quill.format('indent', '+1');
                return false;
              }
              return true;
            }
          },
          'shift tab': {
            key: 9,
            shiftKey: true,
            handler: function (this: any, _range: any, context: any) {
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
      'bold',
      'italic',
      'underline',
      'list',
      'indent',
      'blockquote',
      'code-block',
      'link'
    ]
  });

  // Customize header labels + focus after Quill is ready.
  setTimeout(() => {
    customizeHeaderLabels(editorElement);
    quill.focus();
  }, 100);

  return quill;
}

function customizeHeaderLabels(editorElement: HTMLDivElement) {
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
