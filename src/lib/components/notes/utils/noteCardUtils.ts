// src/lib/components/notes/utils/noteCardUtils.ts

export function stopEventPropagation(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function createCheckboxChangeHandler(
  dispatch: (event: string, detail: any) => void,
  sectionId: string,
  isDragging: boolean
) {
  return (event: Event, lineIndex: number) => {
    stopEventPropagation(event);
    
    if (isDragging) return;
    
    const target = event.target as HTMLInputElement;
    dispatch('checkboxChange', {
      sectionId,
      checked: target.checked,
      lineIndex
    });
  };
}