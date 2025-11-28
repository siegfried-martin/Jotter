<!-- src/lib/components/notes/content/WysiwygContent.svelte -->
<script lang="ts">
  import type { NoteSection } from '$lib/types';

  export let section: NoteSection;
  export let isDragging: boolean = false;
</script>

<div
  class="wysiwyg-content prose prose-sm max-w-none text-sm leading-relaxed break-words"
  class:select-none={isDragging}
>
  {@html section.content}
</div>

<style>
  /* Quill indent classes for list items - supports unlimited nesting */
  /* Each level adds 1.5em of padding */
  :global(.wysiwyg-content .ql-indent-1) { padding-left: 1.5em !important; }
  :global(.wysiwyg-content .ql-indent-2) { padding-left: 3em !important; }
  :global(.wysiwyg-content .ql-indent-3) { padding-left: 4.5em !important; }
  :global(.wysiwyg-content .ql-indent-4) { padding-left: 6em !important; }
  :global(.wysiwyg-content .ql-indent-5) { padding-left: 7.5em !important; }
  :global(.wysiwyg-content .ql-indent-6) { padding-left: 9em !important; }
  :global(.wysiwyg-content .ql-indent-7) { padding-left: 10.5em !important; }
  :global(.wysiwyg-content .ql-indent-8) { padding-left: 12em !important; }

  /* Remove default list styling to use Quill's bullet patterns */
  :global(.wysiwyg-content ul),
  :global(.wysiwyg-content ol) {
    list-style-type: none !important;
    padding-left: 1.5em !important;
  }

  /* Alternating bullet patterns - solid bullet for odd levels, open circle for even */
  :global(.wysiwyg-content li::before) {
    content: "•";
    margin-right: 0.5em;
  }

  :global(.wysiwyg-content li.ql-indent-1::before),
  :global(.wysiwyg-content li.ql-indent-3::before),
  :global(.wysiwyg-content li.ql-indent-5::before),
  :global(.wysiwyg-content li.ql-indent-7::before) {
    content: "◦";
  }

  :global(.wysiwyg-content li.ql-indent-2::before),
  :global(.wysiwyg-content li.ql-indent-4::before),
  :global(.wysiwyg-content li.ql-indent-6::before),
  :global(.wysiwyg-content li.ql-indent-8::before) {
    content: "•";
  }

  /* Ordered list numbering - handled by Quill's data-list attribute */
  :global(.wysiwyg-content li[data-list="ordered"]::before) {
    content: counter(list-item) ".";
    margin-right: 0.5em;
  }
</style>