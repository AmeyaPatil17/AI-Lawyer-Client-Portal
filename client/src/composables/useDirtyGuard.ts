import { onBeforeRouteLeave } from 'vue-router';
import { onMounted, onUnmounted, Ref } from 'vue';

export function useDirtyGuard(isDirty: Ref<boolean>) {
  // Prevent Vue Router navigation if dirty
  onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (confirmLeave) {
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  });

  // Prevent browser window reload/close
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (isDirty.value) {
      event.preventDefault();
      event.returnValue = ''; // Required for Chrome
    }
  };

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });
}
