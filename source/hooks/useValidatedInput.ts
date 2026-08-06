import { useState } from 'react'

/** 管理输入校验失败时的错误提示与输入框重置状态 */
export function useValidatedInput() {
  const [inputError, setInputError] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(0)

  /** 输入不合法: 显示错误并重置输入框 */
  const reject = (message: string) => {
    setInputError(message)
    setInputKey((key) => key + 1)
  }

  /** 输入合法: 清除错误提示 */
  const accept = () => setInputError(null)

  return { inputError, inputKey, reject, accept }
}
