import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const SIZE = 320

async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process that image"))), 'image/jpeg', 0.85),
  )
}

function useInvalidateProfile() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] })
    queryClient.invalidateQueries({ queryKey: ['group-detail'] })
  }
}

export function useUploadAvatar() {
  const { user } = useAuth()
  const invalidate = useInvalidateProfile()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
      if (file.size > 15 * 1024 * 1024) throw new Error('That image is too large (max 15 MB)')

      const blob = await toSquareJpeg(file)
      const path = `${user!.id}/avatar.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) {
        throw new Error(
          uploadError.message.includes('row-level security')
            ? "Photo uploads aren't set up yet. Run the profile photo SQL in Supabase."
            : uploadError.message,
        )
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?v=${Date.now()}`
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useRemoveAvatar() {
  const { user } = useAuth()
  const invalidate = useInvalidateProfile()

  return useMutation({
    mutationFn: async () => {
      await supabase.storage.from('avatars').remove([`${user!.id}/avatar.jpg`])
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
