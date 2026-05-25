import { createRoot } from "react-dom/client"
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
}

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const div = document.createElement("div")
    document.body.appendChild(div)
    const root = createRoot(div)

    let resolved = false

    const done = (value: boolean) => {
      if (resolved) return
      resolved = true
      resolve(value)
      setTimeout(() => {
        root.unmount()
        if (div.parentNode) {
          div.parentNode.removeChild(div)
        }
      }, 0)
    }

    root.render(
      <AlertDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) done(false)
        }}
      >
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              {options.description && (
                <AlertDialogDescription>
                  {options.description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => done(false)}>
                {options.cancelText || "取消"}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => done(true)}>
                {options.confirmText || "确定"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    )
  })
}
