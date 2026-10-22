"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Skeleton,
  TextField,
  Toast,
  Tooltip,
  toast,
} from "@heroui/react";
import {
  ArrowRight,
  Check,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  Keyboard,
  Link2,
  Moon,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";
import { site } from "@/config/site";
import { Logo } from "@/components/logo";
import { defaultStyle, type UpdateStyle } from "@/lib/style/schema";
import { decodeStyle, encodeStyle } from "@/lib/style/codec";
import { parseTweetId } from "@/lib/tweet/parse";
import type { Post, TweetError, TweetResult } from "@/lib/tweet/types";
import { downloadImage, exportImage } from "@/lib/export/image";
import { Inspector } from "./inspector";
import { Presets } from "./presets";
import { Preview } from "./preview";
import type { Dimensions } from "@/components/post/artboard";

function readInitial() {
  const url = new URL(window.location.href);
  const encoded = new URLSearchParams(url.hash.slice(1)).get("s");
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(site.storageKey);
  } catch {
    /* Storage is optional. */
  }
  const stamp = Number(url.searchParams.get("at"));
  return {
    style:
      (encoded ? decodeStyle(encoded) : saved ? decodeStyle(saved) : null) ??
      defaultStyle,
    id: url.searchParams.get("post"),
    now:
      Number.isFinite(stamp) && stamp > 0 && stamp < 1e14 ? stamp : Date.now(),
    invalidStyle: !!encoded && !decodeStyle(encoded),
  };
}

const subscribe = () => () => {};
export function Studio({ example }: { example: Post }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted ? (
    <StudioApp example={example} />
  ) : (
    <div className="boot-shell">
      <Logo size={36} />
      <span>{site.name}</span>
      <Skeleton className="h-64 w-full max-w-xl rounded-2xl" />
    </div>
  );
}

function StudioApp({ example }: { example: Post }) {
  const [initial] = useState(readInitial);
  const [style, setStyle] = useState(initial.style);
  const [post, setPost] = useState(example);
  const [selectedId, setSelectedId] = useState(initial.id);
  const [urlInput, setUrlInput] = useState(
    initial.id ? `https://x.com/i/status/${initial.id}` : "",
  );
  const [loading, setLoading] = useState(!!initial.id);
  const [error, setError] = useState<TweetError | null>(null);
  const [busy, setBusy] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [size, setSize] = useState<Dimensions>({ width: 680, height: 480 });
  const [theme, setTheme] = useState(
    document.documentElement.dataset.theme || "dark",
  );
  const board = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const update: UpdateStyle = (key, value) =>
    setStyle((current) => ({ ...current, [key]: value }));

  const retrieve = useCallback(
    (id: string, signal: AbortSignal) =>
      fetch(`/api/tweet?id=${encodeURIComponent(id)}`, { signal })
        .then((response) => response.json() as Promise<TweetResult>)
        .then((result) => {
          if (signal.aborted) return;
          if (result.error) setError(result.error);
          else {
            setPost(result.post);
            setSelectedId(result.post.id);
            setError(null);
          }
        })
        .catch(() => {
          if (!signal.aborted)
            setError({
              code: "UNAVAILABLE",
              message:
                "We couldn't reach X right now. Check your connection and try again.",
            });
        })
        .finally(() => {
          if (!signal.aborted) setLoading(false);
        }),
    [],
  );

  const loadPost = useCallback(
    (value: string) => {
      if (busyRef.current) return;
      request.current?.abort();
      try {
        const id = parseTweetId(value);
        const controller = new AbortController();
        request.current = controller;
        setUrlInput(value);
        setLoading(true);
        setError(null);
        void retrieve(id, controller.signal);
      } catch {
        setLoading(false);
        setError({
          code: "MALFORMED_URL",
          message:
            "That doesn't look like a post link. Paste an X or Twitter status URL, or a numeric post ID.",
        });
      }
    },
    [retrieve],
  );

  useEffect(() => {
    if (initial.invalidStyle)
      toast.warning(
        "That shared style wasn't valid. Your canvas has been reset.",
      );
    if (!initial.id) return;
    const controller = new AbortController();
    request.current = controller;
    void retrieve(initial.id, controller.signal);
    return () => controller.abort();
  }, [initial, retrieve]);

  useEffect(() => {
    const encoded = encodeStyle(style);
    try {
      localStorage.setItem(site.storageKey, encoded);
    } catch {
      /* Sharing and export still work without storage. */
    }
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("post", selectedId);
    else url.searchParams.delete("post");
    url.searchParams.set("at", String(initial.now));
    url.hash = `s=${encoded}`;
    window.history.replaceState(null, "", url);
  }, [style, selectedId, initial.now]);

  const doExport = useCallback(
    async (copy = false) => {
      if (!board.current || busyRef.current || loading) return;
      busyRef.current = true;
      setBusy(true);
      try {
        if (copy) {
          if (
            !navigator.clipboard?.write ||
            typeof ClipboardItem === "undefined"
          )
            throw new Error(
              "Image copying isn't supported here. Download a PNG instead.",
            );
          // Start the clipboard write during the user gesture, including on WebKit.
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": exportImage(board.current, style, "png"),
            }),
          ]);
          toast.success("Image copied. Go make someone's feed better.");
        } else {
          downloadImage(
            await exportImage(board.current, style),
            post,
            style.format,
          );
          toast.success("Your image is ready. Nice post.");
        }
      } catch (error) {
        toast.danger(
          error instanceof Error
            ? error.message
            : "Export didn't finish. Please try again.",
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [loading, post, style],
  );

  useEffect(() => {
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (!!target.closest(
        "input, textarea, [contenteditable=true], [role=textbox]",
      ) ||
        target.isContentEditable);
    const onPaste = (event: ClipboardEvent) => {
      if (editable(event.target)) return;
      const text = event.clipboardData?.getData("text/plain");
      if (text) {
        event.preventDefault();
        loadPost(text);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "?" && !editable(event.target)) {
        event.preventDefault();
        setShortcuts(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void doExport();
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "c" &&
        !editable(event.target) &&
        !window.getSelection()?.toString()
      ) {
        event.preventDefault();
        void doExport(true);
      }
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, [doExport, loadPost]);

  async function paste() {
    try {
      const value = await navigator.clipboard.readText();
      if (value) loadPost(value);
      else toast.info("Your clipboard is empty. Copy a post link first.");
    } catch {
      toast.info("Paste a link into the field with ⌘V or Ctrl+V instead.");
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Share link copied — your whole look is included");
    } catch {
      toast.info("Copy the address in your browser to share this look.");
    }
  }
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(`${site.storageKey}-theme`, next);
    } catch {
      /* Theme remains active for this visit. */
    }
  }
  const inspectorProps = {
    post,
    style,
    update,
    setStyle,
    reset: () => setStyle(defaultStyle),
    size,
    busy,
    onExport: doExport,
  };

  return (
    <div className="app-shell" data-customizing={customizing}>
      <Toast.Provider />
      <header className="app-header">
        <Link href="/" className="wordmark" aria-label={`${site.name} home`}>
          <Logo />
          <span>{site.name}</span>
        </Link>
        <div className="header-divider" />
        <span className="header-subtitle">The post-to-image studio</span>
        <div className="header-actions">
          <Tooltip>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Keyboard shortcuts"
              onPress={() => setShortcuts(true)}
            >
              <Keyboard size={18} />
            </Button>
            <Tooltip.Content>Keyboard shortcuts · ?</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Toggle light and dark mode"
              onPress={toggleTheme}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Tooltip.Content>Switch appearance</Tooltip.Content>
          </Tooltip>
          <div className="header-divider" />
          <Button
            className="share-button"
            variant="secondary"
            size="sm"
            onPress={share}
          >
            <Link2 size={14} />
            <span>Share look</span>
          </Button>
          <Button
            className="header-download"
            size="sm"
            isPending={busy}
            isDisabled={loading}
            onPress={() => doExport()}
          >
            <Download size={14} />
            <span>Download</span>
          </Button>
        </div>
      </header>
      <main
        className={`studio-layout ${selectedId ? "has-post" : ""}`}
        inert={busy}
        aria-busy={busy}
      >
        <div className="studio-main">
          <section className="hero">
            <div className="hero-eyebrow">
              <span /> A LITTLE MORE WORTH SHARING
            </div>
            <h1>
              Good posts.
              <br className="mobile-break" /> <span>Beautifully framed.</span>
            </h1>
            <p>From your feed to something worth keeping. Make it yours.</p>
            <Form
              className="url-form"
              onSubmit={(event) => {
                event.preventDefault();
                loadPost(urlInput);
              }}
            >
              <Link2 size={18} className="url-icon" />
              <TextField
                aria-label="X post URL"
                value={urlInput}
                onChange={setUrlInput}
                className="url-field"
              >
                <Input
                  placeholder="Paste a link from X / Twitter…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </TextField>
              <Tooltip>
                <Button
                  aria-label="Paste URL from clipboard"
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onPress={paste}
                >
                  <Clipboard size={16} />
                </Button>
                <Tooltip.Content>Paste from clipboard</Tooltip.Content>
              </Tooltip>
              <Button
                type="submit"
                aria-label="Create image"
                className="create-button"
                isPending={loading}
              >
                <span>Create image</span>
                <ArrowRight size={16} />
              </Button>
            </Form>
            <div className="url-helper">
              <span>
                <Check size={12} />
                No sign-up. No watermark.
              </span>
              <span>
                Or press <kbd>⌘ V</kbd> anywhere
              </span>
            </div>
          </section>
          {error && (
            <Alert className="post-error" status="danger" role="alert">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>
                  {error.code === "MALFORMED_URL"
                    ? "Let's try another link"
                    : "This post couldn't make it here"}
                </Alert.Title>
                <Alert.Description>{error.message}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          {post.isTruncated && !loading && (
            <Alert className="post-error" status="warning" role="alert">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>X returned only part of this post</Alert.Title>
                <Alert.Description>
                  We show the text X provides, never an invented ending.{" "}
                  <a
                    href={`https://x.com/i/status/${post.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the original <ExternalLink size={12} />
                  </a>
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          <div className="canvas-section">
            <Preview
              key={post.id}
              post={post}
              style={style}
              now={initial.now}
              loading={loading}
              example={!selectedId}
              boardRef={board}
              size={size}
              onResize={setSize}
            />
            <Presets
              post={post}
              style={style}
              setStyle={setStyle}
              now={initial.now}
            />
          </div>
          <footer className="studio-footer">
            <span>
              <Sparkles size={12} /> Small details. Better stories.
            </span>
            <span>Made for your corner of the internet.</span>
          </footer>
        </div>
        <aside className="inspector" aria-label="Design inspector">
          <Inspector {...inspectorProps} />
        </aside>
      </main>
      <div className="mobile-dock" inert={busy}>
        <Button
          variant="secondary"
          onPress={() => {
            window.scrollTo({ top: 0 });
            setCustomizing(true);
          }}
        >
          <SlidersHorizontal size={16} />
          Customize
        </Button>
        <Drawer.Backdrop
          variant="transparent"
          isOpen={customizing}
          onOpenChange={setCustomizing}
        >
          <Drawer.Content placement="bottom" className="mobile-drawer">
            <Drawer.Dialog>
              <Drawer.Handle />
              <Drawer.Header>
                <Drawer.Heading>Design your post</Drawer.Heading>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body>
                <Inspector {...inspectorProps} />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
        <Button
          isIconOnly
          variant="secondary"
          aria-label="Copy image"
          isDisabled={busy || loading}
          onPress={() => doExport(true)}
        >
          <Copy size={16} />
        </Button>
        <Button
          isDisabled={loading}
          isPending={busy}
          onPress={() => doExport()}
        >
          <Download size={16} />
          Download
        </Button>
      </div>
      <Modal.Backdrop isOpen={shortcuts} onOpenChange={setShortcuts}>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>A little less clicking</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="panel-note">
                Your studio, at your fingertips. Use Ctrl on Windows and Linux.
              </p>
              <div className="shortcuts-list">
                {[
                  ["Paste a post link", "⌘ / Ctrl V"],
                  ["Download image", "⌘ / Ctrl S"],
                  ["Copy image", "⌘ / Ctrl C"],
                  ["Show shortcuts", "?"],
                  ["Close a dialog", "Esc"],
                ].map(([label, key]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <kbd>{key}</kbd>
                  </div>
                ))}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Got it
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
