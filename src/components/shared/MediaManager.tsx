
"use client";

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ImagePlus, Video, PlusCircle, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';

const MediaManager = ({
  title,
  type,
  fields,
  append,
  remove,
  update,
  isReadOnly,
}: {
  title: string;
  type: 'image' | 'video';
  fields: any[];
  append: (item: any) => void;
  remove: (index: number) => void;
  update: (index: number, item: any) => void;
  isReadOnly: boolean;
}) => {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<{ index: number; data: any } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleAddClick = () => {
    setEditingMedia(null);
    setIsMediaModalOpen(true);
  };

  const handleEditClick = (index: number, data: any) => {
    setEditingMedia({ index, data });
    setIsMediaModalOpen(true);
  };

  const handleMediaSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event from bubbling to parent forms
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    const description = formData.get('description') as string;

    if (!url) return;

    if (editingMedia) {
      update(editingMedia.index, { ...editingMedia.data, url, description });
    } else {
      append({ id: uuidv4(), url, description });
    }
    setIsMediaModalOpen(false);
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('vimeo.com')) {
      const id = url.split('/').pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  };

  const getYouTubeThumbnail = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          {type === 'image' ? <ImagePlus className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          {title}
        </h4>
        {!isReadOnly && (
          <Button type="button" variant="outline" size="sm" onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add {type === 'image' ? 'Image' : 'Video'} Link
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-1 group">
            <div className="relative aspect-square rounded-lg border overflow-hidden bg-muted">
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="w-full h-full flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                {type === 'image' ? (
                  <Image src={field.url} alt={field.description || ''} className="object-cover" fill sizes="20vw" />
                ) : (
                  <div className="w-full h-full relative">
                    {getYouTubeThumbnail(field.url) ? (
                      <Image src={getYouTubeThumbnail(field.url)!} alt={field.description || ''} className="object-cover" fill sizes="20vw"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <Video className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )}
              </button>
              {!isReadOnly && (
                <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button type="button" variant="secondary" size="icon" className="h-7 w-7 shadow-sm" onClick={() => handleEditClick(index, field)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="destructive" size="icon" className="h-7 w-7 shadow-sm" onClick={() => remove(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            {field.description && (
              <p className="text-xs font-semibold text-primary/80 line-clamp-2 px-1 py-1 mt-1.5 rounded">
                {field.description}
              </p>
            )}
          </div>
        ))}
        {fields.length === 0 && (
          <div className="col-span-full py-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
            <p className="text-xs italic">No {type}s added yet.</p>
          </div>
        )}
      </div>

      <Dialog open={isMediaModalOpen} onOpenChange={setIsMediaModalOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{editingMedia ? 'Edit' : 'Add'} {type === 'image' ? 'Image' : 'Video'} Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMediaSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Media Link (URL)</Label>
              <Input name="url" defaultValue={editingMedia?.data?.url || ''} placeholder="https://..." required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" defaultValue={editingMedia?.data?.description || ''} placeholder="Enter a brief description..." className="min-h-[100px]" />
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsMediaModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative flex flex-col h-[80vh]">
            <div className="flex-1 relative flex items-center justify-center p-4">
              {lightboxIndex !== null && fields[lightboxIndex] && (
                <>
                  {type === 'image' ? (
                    <Image
                      src={fields[lightboxIndex].url}
                      alt={fields[lightboxIndex].description || ''}
                      className="object-contain shadow-2xl"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-black flex items-center justify-center overflow-hidden rounded-lg shadow-2xl">
                      {getEmbedUrl(fields[lightboxIndex].url) ? (
                        <iframe
                          src={getEmbedUrl(fields[lightboxIndex].url)!}
                          className="w-full h-full border-none"
                          allowFullScreen
                          title={fields[lightboxIndex].description || 'Video'}
                        />
                      ) : (
                        <video
                          src={fields[lightboxIndex].url}
                          controls
                          className="w-full h-full"
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              {fields.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => setLightboxIndex(prev => (prev! - 1 + fields.length) % fields.length)}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => setLightboxIndex(prev => (prev! + 1) % fields.length)}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}
            </div>
            {lightboxIndex !== null && fields[lightboxIndex]?.description && (
              <div className="p-6 bg-black/80 text-white border-t border-white/10">
                <p className="text-sm font-medium">{fields[lightboxIndex].description}</p>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white/70 hover:text-white"
              onClick={() => setLightboxIndex(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default MediaManager;
