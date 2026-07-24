import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { confirmAction } from './useAdminUi'

export function useUnsavedChanges(isDirty: Ref<boolean>) {
  function beforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true
    return confirmAction({
      title: 'Rời màn hình khi chưa lưu?',
      message: 'Các thay đổi đang nhập chưa được lưu. Bạn có thể ở lại để hoàn tất hoặc rời đi và giữ bản nháp tạm trong phiên này.',
      confirmLabel: 'Rời màn hình',
    })
  })
}
