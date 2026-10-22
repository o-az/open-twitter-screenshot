"use client";

import { useRef } from "react";
import { Button, toast } from "@heroui/react";
import { Check, ImagePlus, Sparkles } from "lucide-react";
import { gradientCSS, gradients, meshes } from "@/lib/style/presets";
import type { StyleState, UpdateStyle } from "@/lib/style/schema";
import { uploadBackground } from "@/lib/export/image";
import { Choice, ColorControl, Range, SectionTitle, Toggle } from "./controls";

export function BackgroundPanel({
  style,
  update,
  setStyle,
}: {
  style: StyleState;
  update: UpdateStyle;
  setStyle: (style: StyleState) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="panel-fields">
      <Choice
        label="Background type"
        value={style.background}
        onChange={(v) => update("background", v)}
        options={[
          { id: "gradient", label: "Gradient" },
          { id: "solid", label: "Solid" },
          { id: "mesh", label: "Mesh" },
          { id: "image", label: "Image" },
          { id: "transparent", label: "None" },
        ]}
      />
      {style.background === "gradient" && (
        <>
          <div>
            <div className="section-heading">
              <SectionTitle>Curated gradients</SectionTitle>
              <span>20 colorscapes</span>
            </div>
            <div className="gradient-grid">
              {gradients.map((gradient, index) => (
                <Button
                  className={`gradient-button ${style.gradient === index && !style.customGradient ? "is-selected" : ""}`}
                  key={gradient.name}
                  aria-label={`Use ${gradient.name} gradient`}
                  aria-pressed={
                    style.gradient === index && !style.customGradient
                  }
                  onPress={() =>
                    setStyle({
                      ...style,
                      gradient: index,
                      customGradient: false,
                    })
                  }
                  style={{
                    background: gradientCSS(gradient.colors, gradient.angle),
                  }}
                >
                  {style.gradient === index && !style.customGradient && (
                    <Check size={17} />
                  )}
                </Button>
              ))}
            </div>
            <p className="gradient-caption">
              <span>
                {style.customGradient
                  ? "Your own blend"
                  : gradients[style.gradient].name}
              </span>
              <Sparkles size={12} /> A little atmosphere.
            </p>
          </div>
          <Toggle
            label="Create your own gradient"
            value={style.customGradient}
            onChange={(v) => update("customGradient", v)}
          />
          {style.customGradient && (
            <div className="panel-fields">
              <ColorControl
                label="First color"
                value={style.stop1}
                onChange={(v) => update("stop1", v)}
              />
              <ColorControl
                label="Second color"
                value={style.stop2}
                onChange={(v) => update("stop2", v)}
              />
              <Toggle
                label="Third color stop"
                value={style.threeStops}
                onChange={(v) => update("threeStops", v)}
              />
              {style.threeStops && (
                <ColorControl
                  label="Third color"
                  value={style.stop3}
                  onChange={(v) => update("stop3", v)}
                />
              )}
              <Range
                label="Gradient angle"
                value={style.angle}
                min={0}
                max={360}
                unit="°"
                onChange={(v) => update("angle", v)}
              />
            </div>
          )}
        </>
      )}
      {style.background === "solid" && (
        <ColorControl
          label="Canvas color"
          value={style.backgroundColor}
          onChange={(v) => update("backgroundColor", v)}
        />
      )}
      {style.background === "mesh" && (
        <div>
          <SectionTitle>Softly blended</SectionTitle>
          <div className="mesh-grid">
            {meshes.map((mesh, index) => (
              <Button
                key={mesh.name}
                className={`mesh-button ${style.mesh === index ? "is-selected" : ""}`}
                aria-pressed={style.mesh === index}
                onPress={() => update("mesh", index)}
                style={{ background: mesh.css }}
              >
                <span>{mesh.name}</span>
                {style.mesh === index && <Check size={16} />}
              </Button>
            ))}
          </div>
        </div>
      )}
      {style.background === "image" && (
        <div className="upload-zone">
          <ImagePlus size={28} />
          <strong>A backdrop of your own</strong>
          <p>PNG, JPEG, or WebP · up to 10 MB</p>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => input.current?.click()}
          >
            {style.image ? "Replace image" : "Choose an image"}
          </Button>
          <input
            ref={input}
            className="sr-only"
            tabIndex={-1}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Upload background image"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                update("image", await uploadBackground(file));
                toast.success("Your backdrop is ready");
              } catch (error) {
                toast.danger(
                  error instanceof Error
                    ? error.message
                    : "Couldn't open that image",
                );
              }
              event.target.value = "";
            }}
          />
          <p className="panel-note">
            Optimized locally and included in your share link. Never uploaded.
          </p>
        </div>
      )}
      {style.background === "transparent" && (
        <p className="panel-note">
          The checkerboard is only a guide. PNG, WebP, and SVG preserve
          transparency. JPEG uses white.
        </p>
      )}
      <div className="panel-divider" />
      <Range
        label="Canvas padding"
        value={style.backgroundPadding}
        min={0}
        max={180}
        step={4}
        onChange={(v) => update("backgroundPadding", v)}
      />
      <Toggle
        label="Subtle grain"
        value={style.grain}
        onChange={(v) => update("grain", v)}
        unavailable={
          style.background === "transparent"
            ? "Grain is disabled on a transparent canvas to preserve alpha."
            : undefined
        }
      />
      <div className="design-tip">
        <Sparkles size={15} />
        <p>
          Give your words room to breathe.
          <br />
          <span>More padding. A little less noise.</span>
        </p>
      </div>
    </div>
  );
}
