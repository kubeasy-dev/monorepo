import { Play } from "lucide-react";

// Set VITE_LOOM_VIDEO_URL to the Loom embed URL when available
// e.g. https://www.loom.com/embed/<video-id>
const LOOM_VIDEO_URL = import.meta.env.VITE_LOOM_VIDEO_URL as
  | string
  | undefined;

export function VideoSection() {
  return (
    <section className="py-24 px-4 bg-secondary">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            See it in action
          </h2>
          <p className="text-lg font-bold text-muted-foreground">
            A full challenge end-to-end — from a broken cluster to a working
            fix.
          </p>
        </div>

        <div className="neo-border-thick neo-shadow-xl rounded-xl overflow-hidden bg-card aspect-video flex items-center justify-center">
          {LOOM_VIDEO_URL ? (
            <iframe
              src={LOOM_VIDEO_URL}
              className="w-full h-full"
              allowFullScreen
              title="Kubeasy — See it in action"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-muted-foreground select-none">
              <div className="w-20 h-20 rounded-full bg-secondary neo-border-thick flex items-center justify-center">
                <Play className="w-8 h-8 ml-1" />
              </div>
              <p className="font-bold text-lg">Coming soon</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
