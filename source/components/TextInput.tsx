import { Text, useInput } from 'ink'
import { useState } from 'react'

type Props = {
  prompt: string
  onSubmit: (value: string) => void
  placeholder?: string
  initialValue?: string
}

export default function TextInput({ prompt, onSubmit, placeholder, initialValue = '' }: Props) {
  const [value, setValue] = useState(initialValue)
  const [submitted, setSubmitted] = useState(false)

  useInput(
    (input, key) => {
      if (submitted) return

      if (key.return) {
        setSubmitted(true)
        onSubmit(value)
      } else if (key.backspace || key.delete) {
        setValue((prev) => prev.slice(0, -1))
      } else if (!key.ctrl && !key.meta && input && input.length > 0) {
        setValue((prev) => prev + input)
      }
    },
    { isActive: !submitted },
  )

  const display = submitted ? value : `${value}${placeholder && !value ? placeholder : ''}`

  return (
    <Text>
      {prompt}
      {submitted ? (
        <Text color="green">{display}</Text>
      ) : (
        <Text>
          {display}
          <Text color="gray">█</Text>
        </Text>
      )}
    </Text>
  )
}
