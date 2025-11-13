import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  objectCode: string;
  objectName: string;
}

export function QRCodeDialog({ open, onOpenChange, objectId, objectCode, objectName }: QRCodeDialogProps) {
  const documentUrl = `${window.location.origin}/objects/${objectId}/documents`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(documentUrl)}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-${objectCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>QR Code объекта</DialogTitle>
          <DialogDescription>
            {objectName} ({objectCode})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="border-2 border-border rounded-lg p-4 bg-white">
            <img
              src={qrCodeUrl}
              alt={`QR код для ${objectCode}`}
              className="w-64 h-64"
            />
          </div>

          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Закрыть
            </Button>
            <Button
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Скачать
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Отсканируйте QR код для быстрого доступа к объекту
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
