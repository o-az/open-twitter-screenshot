import { Accordion } from "@heroui/react";
import { themes, type StyleState, type UpdateStyle } from "@/lib/style/schema";
import {
  Choice,
  ColorControl,
  DropdownField,
  Range,
  SectionTitle,
  Toggle,
} from "./controls";

export function StylePanel({
  style,
  update,
  setStyle,
}: {
  style: StyleState;
  update: UpdateStyle;
  setStyle: (style: StyleState) => void;
}) {
  return (
    <div className="panel-fields">
      <Choice
        label="Card theme"
        value={style.theme}
        onChange={(theme) =>
          setStyle({
            ...style,
            ...(theme !== "custom" ? themes[theme] : {}),
            theme,
          })
        }
        options={[
          { id: "light", label: "Light" },
          { id: "dim", label: "Dim" },
          { id: "dark", label: "Lights out" },
          { id: "custom", label: "Custom" },
        ]}
      />
      <div className="color-fields">
        {(
          [
            { key: "cardColor", label: "Background" },
            { key: "textColor", label: "Text" },
            { key: "secondaryColor", label: "Secondary" },
            { key: "accentColor", label: "Links" },
          ] as const
        ).map(({ key, label }) => (
          <ColorControl
            key={key}
            label={label}
            value={style[key]}
            onChange={(value) =>
              setStyle({ ...style, [key]: value, theme: "custom" })
            }
          />
        ))}
      </div>
      <div>
        <SectionTitle>Typography</SectionTitle>
        <DropdownField
          label="Typeface"
          value={style.font}
          onChange={(v) => update("font", v)}
          options={[
            { id: "system", label: "System" },
            { id: "inter", label: "Inter" },
            { id: "geist", label: "Geist" },
            { id: "serif", label: "Lora · Serif" },
            { id: "mono", label: "Geist Mono" },
          ]}
        />
      </div>
      <Range
        label="Font size"
        value={style.fontSize}
        min={14}
        max={36}
        onChange={(v) => update("fontSize", v)}
      />
      <Range
        label="Card width"
        value={style.cardWidth}
        min={320}
        max={800}
        step={10}
        onChange={(v) => update("cardWidth", v)}
      />
      <Range
        label="Inner padding"
        value={style.padding}
        min={16}
        max={64}
        onChange={(v) => update("padding", v)}
      />
      <Range
        label="Corner radius"
        value={style.radius}
        min={0}
        max={48}
        onChange={(v) => update("radius", v)}
      />
      <Choice
        label="Shadow"
        value={style.shadow}
        onChange={(v) => update("shadow", v)}
        options={[
          { id: "none", label: "None" },
          { id: "soft", label: "Soft" },
          { id: "strong", label: "Strong" },
          { id: "glow", label: "Glow" },
        ]}
      />
      <Toggle
        label="Glass effect"
        value={style.glass}
        onChange={(v) => update("glass", v)}
      />
      <Accordion>
        <Accordion.Item id="border">
          <Accordion.Heading>
            <Accordion.Trigger>
              Border
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="panel-fields">
              <Toggle
                label="Show border"
                value={style.border}
                onChange={(v) => update("border", v)}
              />
              {style.border && (
                <>
                  <Range
                    label="Border width"
                    value={style.borderWidth}
                    min={1}
                    max={8}
                    onChange={(v) => update("borderWidth", v)}
                  />
                  <ColorControl
                    label="Border"
                    value={style.borderColor}
                    onChange={(v) => update("borderColor", v)}
                  />
                  <Choice
                    label="Border style"
                    value={style.borderStyle}
                    onChange={(v) => update("borderStyle", v)}
                    options={[
                      { id: "solid", label: "Solid" },
                      { id: "dashed", label: "Dashed" },
                      { id: "gradient", label: "Gradient" },
                    ]}
                  />
                </>
              )}
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
