import { Box, Text } from 'ink'
import { useEffect, useState } from 'react'

export default function StatusBar() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Box width="100%" height={1} justifyContent="space-between" paddingX={1} backgroundColor="blue">
      <Text color="white" wrap="truncate-start">
        {process.cwd()}
      </Text>
      <Box flexShrink={0}>
        <Text color="white">{now.toTimeString().slice(0, 8)}</Text>
      </Box>
    </Box>
  )
}
