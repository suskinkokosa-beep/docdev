import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить доступ к камере',
        variant: 'destructive'
      });
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    setIsOpen(false);
  };

  const handleManualInput = () => {
    const code = prompt('Введите QR-код объекта:');
    if (code) {
      onScan(code);
      handleClose();
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <Camera className="mr-2 h-4 w-4" />
        Сканировать QR
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сканирование QR-кода</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-4">
            {!scanning ? (
              <div className="flex flex-col gap-2">
                <Button onClick={startScanning}>
                  <Camera className="mr-2 h-4 w-4" />
                  Запустить камеру
                </Button>
                <Button onClick={handleManualInput} variant="outline">
                  Ввести код вручную
                </Button>
              </div>
            ) : (
              <div className="relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  className="w-full rounded-lg"
                />
                <div className="absolute inset-0 border-4 border-primary rounded-lg pointer-events-none" />
                <Button
                  onClick={stopScanning}
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground text-center">
              Наведите камеру на QR-код объекта
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
