'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-red-600">Critical Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-gray-600">
                A critical error occurred in the application. Please refresh the page or contact support.
              </p>
              {error.digest && (
                <p className="text-sm text-gray-400">
                  Error ID: {error.digest}
                </p>
              )}
              <div className="flex gap-2 justify-center">
                <Button onClick={() => reset()}>
                  Try again
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                  Go home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}