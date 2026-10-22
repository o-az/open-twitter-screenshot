import { Button, Tabs } from "@heroui/react";
import {
  FileText,
  Frame,
  Image,
  Paintbrush,
  RotateCcw,
  Upload,
} from "lucide-react";
import type { Post } from "@/lib/tweet/types";
import type { StyleState, UpdateStyle } from "@/lib/style/schema";
import type { Dimensions } from "@/components/post/artboard";
import { BackgroundPanel } from "./background-panel";
import { ContentPanel } from "./content-panel";
import { StylePanel } from "./style-panel";
import { ExportPanel, FramePanel } from "./frame-export-panel";

export function Inspector({
  post,
  style,
  update,
  setStyle,
  reset,
  size,
  busy,
  onExport,
}: {
  post: Post;
  style: StyleState;
  update: UpdateStyle;
  setStyle: (style: StyleState) => void;
  reset: () => void;
  size: Dimensions;
  busy: boolean;
  onExport: (copy?: boolean) => void;
}) {
  return (
    <div className="inspector-inner" inert={busy}>
      <div className="inspector-heading">
        <div>
          <h2>Make it yours</h2>
          <p>A few details. A whole different feeling.</p>
        </div>
        <Button
          variant="ghost"
          isIconOnly
          size="sm"
          aria-label="Reset style"
          onPress={reset}
        >
          <RotateCcw size={15} />
        </Button>
      </div>
      <Tabs className="inspector-tabs" defaultSelectedKey="background">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Design controls">
            {[
              { id: "content", label: "Content", Icon: FileText },
              { id: "style", label: "Style", Icon: Paintbrush },
              { id: "background", label: "Backdrop", Icon: Image },
              { id: "frame", label: "Frame", Icon: Frame },
              { id: "export", label: "Export", Icon: Upload },
            ].map(({ id, label, Icon }) => (
              <Tabs.Tab key={id} id={id}>
                <Icon size={17} />
                <span>{label}</span>
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="content">
          <ContentPanel post={post} style={style} update={update} />
        </Tabs.Panel>
        <Tabs.Panel id="style">
          <StylePanel style={style} update={update} setStyle={setStyle} />
        </Tabs.Panel>
        <Tabs.Panel id="background">
          <BackgroundPanel style={style} update={update} setStyle={setStyle} />
        </Tabs.Panel>
        <Tabs.Panel id="frame">
          <FramePanel style={style} update={update} />
        </Tabs.Panel>
        <Tabs.Panel id="export">
          <ExportPanel
            style={style}
            update={update}
            size={size}
            busy={busy}
            onExport={onExport}
          />
        </Tabs.Panel>
      </Tabs>
      <div className="inspector-bottom">
        <span className="status-dot" />
        Every change, instantly on canvas.<span>↗</span>
      </div>
    </div>
  );
}
