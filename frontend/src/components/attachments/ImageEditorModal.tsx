import React, { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Pencil,
  Square,
  Save,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { attachmentsApi } from '@/lib/api'
import { useNoteStore } from '@/stores/noteStore'

interface ImageEditorModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl?: string
  originalFilename?: string
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  originalFilename = 'edited-image.png',
}) => {
  const { toast } = useToast()
  const { activeNote } = useNoteStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !imageUrl) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600,
      height: 400,
      backgroundColor: '#0f172a',
    })

    fabricCanvasRef.current = canvas

    // Load image into canvas
    fabric.Image.fromURL(
      imageUrl,
      (img) => {
        if (!img) return
        img.scaleToWidth(500)
        img.scaleToHeight(350)
        canvas.centerObject(img)
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
      },
      { crossOrigin: 'anonymous' }
    )

    return () => {
      canvas.dispose()
      fabricCanvasRef.current = null
    }
  }, [isOpen, imageUrl])

  // Rotate clockwise 90deg
  const handleRotate = (angle: number) => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const activeObj = canvas.getActiveObject()
    if (activeObj) {
      activeObj.rotate((activeObj.angle || 0) + angle)
      canvas.renderAll()
    }
  }

  // Flip horizontal
  const handleFlipH = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const activeObj = canvas.getActiveObject()
    if (activeObj) {
      activeObj.set('flipX', !activeObj.flipX)
      canvas.renderAll()
    }
  }

  // Flip vertical
  const handleFlipV = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const activeObj = canvas.getActiveObject()
    if (activeObj) {
      activeObj.set('flipY', !activeObj.flipY)
      canvas.renderAll()
    }
  }

  // Toggle freehand drawing mode
  const toggleDrawingMode = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    canvas.isDrawingMode = !canvas.isDrawingMode
    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush.color = '#ef4444'
      canvas.freeDrawingBrush.width = 4
    }
    setIsDrawing(canvas.isDrawingMode)
  }

  // Add rectangle annotation
  const handleAddRectangle = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: '#ef4444',
      strokeWidth: 3,
      width: 120,
      height: 80,
    })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.renderAll()
  }

  // Save edited image to S3 and close
  const handleSave = async () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !activeNote) return

    setIsSaving(true)
    try {
      // Export canvas to base64 DataURL
      const dataUrl = canvas.toDataURL({ format: 'png', quality: 0.9 })

      // Convert DataURL to Blob / File
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `edited-${originalFilename}`, { type: 'image/png' })

      // Upload to backend (which uploads to S3)
      await attachmentsApi.upload(file, activeNote.id)
      toast({
        title: 'Edited image saved',
        description: 'Image processed and uploaded to S3 storage.',
      })
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to save edited image',
        description: err.response?.data?.detail || 'Image processing error.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-base">NexusNotes Image Editor</DialogTitle>
        </DialogHeader>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/40 rounded-lg border border-border/60 select-none">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleRotate(-90)}
            title="Rotate Left 90°"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleRotate(90)}
            title="Rotate Right 90°"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleFlipH}
            title="Flip Horizontal"
          >
            <FlipHorizontal className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleFlipV}
            title="Flip Vertical"
          >
            <FlipVertical className="h-4 w-4" />
          </Button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <Button
            variant={isDrawing ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={toggleDrawingMode}
            title="Pencil / Draw Annotation"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleAddRectangle}
            title="Add Rectangle Box"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>

        {/* Canvas Area */}
        <div className="flex items-center justify-center p-2 bg-black/40 rounded-lg border border-border overflow-hidden">
          <canvas ref={canvasRef} />
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Uploading to S3...' : 'Save & Attach to Note'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
