import { readonly, ref } from 'vue'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface AdminToast {
  id: number
  message: string
  tone: ToastTone
}

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

interface ConfirmRequest extends Required<ConfirmOptions> {
  resolve: (confirmed: boolean) => void
}

interface PromptOptions {
  title: string
  message: string
  label: string
  initialValue?: string
  placeholder?: string
  confirmLabel?: string
  required?: boolean
}

interface PromptRequest extends Required<PromptOptions> {
  resolve: (value: string | null) => void
}

const toasts = ref<AdminToast[]>([])
const confirmRequest = ref<ConfirmRequest | null>(null)
const promptRequest = ref<PromptRequest | null>(null)
let toastId = 0

export function notify(message: string, tone: ToastTone = 'success') {
  const id = ++toastId
  toasts.value.push({ id, message, tone })
  window.setTimeout(() => dismissToast(id), 4500)
}

export function dismissToast(id: number) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export function confirmAction(options: ConfirmOptions) {
  if (confirmRequest.value) confirmRequest.value.resolve(false)
  return new Promise<boolean>((resolve) => {
    confirmRequest.value = {
      confirmLabel: 'Xác nhận',
      cancelLabel: 'Quay lại',
      tone: 'danger',
      ...options,
      resolve,
    }
  })
}

export function resolveConfirm(confirmed: boolean) {
  const request = confirmRequest.value
  confirmRequest.value = null
  request?.resolve(confirmed)
}

export function promptAction(options: PromptOptions) {
  if (promptRequest.value) promptRequest.value.resolve(null)
  return new Promise<string | null>((resolve) => {
    promptRequest.value = {
      initialValue: '',
      placeholder: '',
      confirmLabel: 'Lưu',
      required: true,
      ...options,
      resolve,
    }
  })
}

export function resolvePrompt(value: string | null) {
  const request = promptRequest.value
  promptRequest.value = null
  request?.resolve(value)
}

export function useAdminUi() {
  return {
    toasts: readonly(toasts),
    confirmRequest: readonly(confirmRequest),
    promptRequest: readonly(promptRequest),
    notify,
    dismissToast,
    confirmAction,
    resolveConfirm,
    promptAction,
    resolvePrompt,
  }
}
