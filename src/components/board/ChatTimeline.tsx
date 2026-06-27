"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BellOff, Camera, Clock3, Eye, Heart, Mic, Pencil, Reply, Send,
  Sparkles, Trash2, Volume2,
} from "lucide-react";
import clsx from "clsx";
import { BoardPlayback } from "@/components/board/BoardPlayback";
import { BOARD_COLORS, type BoardColorKey, type BoardMedia, type ChalkDrawing } from "@/types/chalk";

export type ChatBoard = {
  id: string;
  kind: string;
  caption: string | null;
  drawing: ChalkDrawing;
  boardColor: BoardColorKey;
  media: BoardMedia | null;
  gift: string | null;
  prompt: string | null;
  createdAt: string;
  editedAt: string | null;
  silent: boolean;
  seenCount: number;
  currentUserId: string;
  locked: boolean;
  sender: { id: string; name: string | null; image: string | null };
  replyTo: {
    id: string;
    kind: string;
    caption: string | null;
    sender: { name: string | null };
  } | null;
};

const DAILY_PROMPTS = [
  "What made you smile today?",
  "Send one thing you want us to do together.",
  "Describe your mood in three words.",
  "What tiny thing reminded you of me?",
  "Share one honest thought from today.",
  "What should our next little adventure be?",
  "Send a good-night note for future us.",
];

export function ChatTimeline({
  circleId,
  boards,
  onChanged,
  onOpenMoments,
}: {
  circleId: string;
  boards: ChatBoard[];
  onChanged: () => void;
  onOpenMoments: () => void;
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatBoard | null>(null);
  const [silent, setSilent] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const [expiresIn, setExpiresIn] = useState<"never" | "1h" | "24h" | "7d">("never");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [people, setPeople] = useState<{ typing: boolean; user: { name: string | null } }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStarted = useRef(0);
  const [recording, setRecording] = useState(false);

  const ordered = useMemo(
    () => [...boards].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [boards]
  );
  const prompt = DAILY_PROMPTS[new Date().getDay()];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: boards.length > 1 ? "smooth" : "auto" });
  }, [boards.length]);

  useEffect(() => {
    let cancelled = false;
    async function heartbeat() {
      await fetch(`/api/circles/${circleId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: false }),
      }).catch(() => {});
      const response = await fetch(`/api/circles/${circleId}/presence`, { cache: "no-store" }).catch(() => null);
      if (response?.ok && !cancelled) setPeople((await response.json()).people ?? []);
    }
    heartbeat();
    const timer = window.setInterval(heartbeat, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, [circleId]);

  function announceTyping(value: string) {
    setText(value);
    fetch(`/api/circles/${circleId}/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typing: value.trim().length > 0 }),
    }).catch(() => {});
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      fetch(`/api/circles/${circleId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: false }),
      }).catch(() => {});
    }, 2_000);
  }

  async function send(payload: {
    kind: "text" | "photo" | "voice";
    caption?: string;
    media?: BoardMedia;
  }) {
    if (sending) return;
    setSending(true);
    setStatus("");
    const response = await fetch(`/api/boards/${circleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drawing: { strokes: [], textElements: [], viewBox: { width: 600, height: 600 } },
        boardColor: "chalkboard-green",
        deliveryMode: "normal",
        kind: payload.kind,
        caption: payload.caption || null,
        media: payload.media || null,
        viewOnce,
        silent,
        replyToId: replyTo?.id || null,
        expiresAt:
          expiresIn === "never"
            ? null
            : new Date(Date.now() + { "1h": 3_600_000, "24h": 86_400_000, "7d": 604_800_000 }[expiresIn]).toISOString(),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) return setStatus(body.error || "Could not send. Try again.");
    setText("");
    setReplyTo(null);
    setSilent(false);
    setViewOnce(false);
    setExpiresIn("never");
    await onChanged();
  }

  async function choosePhoto(file?: File) {
    if (!file) return;
    setStatus("Optimizing snap…");
    try {
      const dataUrl = await compressPhoto(file);
      await send({ kind: "photo", media: { type: "photo", dataUrl, name: file.name } });
      setStatus("");
    } catch {
      setStatus("Could not prepare that photo.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function startRecording() {
    if (recording || sending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const recorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 32_000,
        ...(mimeType ? { mimeType } : {}),
      });
      chunksRef.current = [];
      recordingStarted.current = Date.now();
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const duration = Math.max(1, Math.round((Date.now() - recordingStarted.current) / 1_000));
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size > 900_000) return setStatus("Voice note is too long.");
        await send({
          kind: "voice",
          media: { type: "voice", dataUrl: await blobToDataUrl(blob), duration, bytes: blob.size },
        });
      };
      recorderRef.current = recorder;
      recorder.start(500);
      setRecording(true);
      setStatus("Recording… release to send");
    } catch {
      setStatus("Microphone permission is required.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function edit(board: ChatBoard) {
    const caption = window.prompt("Edit message", board.caption || "");
    if (!caption || caption === board.caption) return;
    const response = await fetch(`/api/boards/${circleId}/${board.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setStatus(body.error || "Could not edit.");
    onChanged();
  }

  async function remove(board: ChatBoard) {
    if (!window.confirm("Delete this message?")) return;
    await fetch(`/api/boards/${circleId}/${board.id}`, { method: "DELETE" });
    onChanged();
  }

  async function react(board: ChatBoard) {
    await fetch(`/api/boards/${circleId}/${board.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: "❤️" }),
    });
    onChanged();
  }

  const typingNames = people.filter((person) => person.typing).map((person) => person.user.name || "Someone");
  const onlineNames = people.map((person) => person.user.name || "Someone");

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-2xl flex-col">
      <div className="mb-3 flex items-center justify-between px-1 text-[11px] text-ink-soft/60">
        <span>{typingNames.length ? `${typingNames.join(", ")} typing…` : onlineNames.length ? `${onlineNames.join(", ")} online` : "Your private space"}</span>
        <span>encrypted in transit</span>
      </div>

      <button
        onClick={() => setText(prompt)}
        className="mb-4 flex items-start gap-3 rounded-2xl border border-chalk-amber/20 bg-chalk-amber/10 p-3 text-left"
      >
        <Sparkles size={16} className="mt-0.5 shrink-0 text-chalk-amber" />
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">Today’s little ritual</span>
          <span className="mt-0.5 block text-sm text-ink">{prompt}</span>
        </span>
      </button>

      <div className="flex-1 space-y-3">
        {ordered.length === 0 && (
          <div className="py-14 text-center">
            <p className="font-hand text-3xl text-ink">Say something only they get</p>
            <p className="mt-2 text-sm text-ink-soft/60">Text, snap, whisper, or leave a chalk.</p>
          </div>
        )}
        {ordered.map((board) => (
          <ChatItem
            key={board.id}
            board={board}
            circleId={circleId}
            onReply={() => setReplyTo(board)}
            onEdit={() => edit(board)}
            onDelete={() => remove(board)}
            onReact={() => react(board)}
            onOpenMoments={onOpenMoments}
          />
        ))}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-line bg-paper/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2 text-xs text-ink-soft">
            <Reply size={13} />
            <span className="min-w-0 flex-1 truncate">Replying to {replyTo.sender.name || "message"}: {replyTo.caption || replyTo.kind}</span>
            <button onClick={() => setReplyTo(null)}>×</button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <button onClick={() => fileRef.current?.click()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink-soft" aria-label="Quick snap">
            <Camera size={19} />
          </button>
          <input ref={fileRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => choosePhoto(event.target.files?.[0])} />
          <button
            onPointerDown={startRecording}
            onPointerUp={stopRecording}
            onPointerCancel={stopRecording}
            className={clsx("flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-full", recording ? "animate-pulse bg-dust-pink text-white" : "bg-ink/5 text-ink-soft")}
            aria-label="Hold to record voice"
          >
            <Mic size={19} />
          </button>
          <textarea
            value={text}
            onChange={(event) => announceTyping(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (text.trim()) send({ kind: "text", caption: text.trim() });
              }
            }}
            rows={1}
            maxLength={2_000}
            placeholder="Message your person…"
            className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-line bg-card px-3 py-3 text-sm text-ink outline-none focus:border-chalk-amber"
          />
          <button
            disabled={!text.trim() || sending}
            onClick={() => send({ kind: "text", caption: text.trim() })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper disabled:opacity-30"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 px-1">
          <button onClick={() => setSilent((value) => !value)} className={clsx("flex items-center gap-1 text-[11px]", silent ? "text-chalk-amber" : "text-ink-soft/50")}>
            <BellOff size={12} /> silent
          </button>
          <button onClick={() => setViewOnce((value) => !value)} className={clsx("flex items-center gap-1 text-[11px]", viewOnce ? "text-dust-pink" : "text-ink-soft/50")}>
            <Eye size={12} /> view once media
          </button>
          <label className="flex items-center gap-1 text-[11px] text-ink-soft/50">
            <Clock3 size={12} />
            <select value={expiresIn} onChange={(event) => setExpiresIn(event.target.value as typeof expiresIn)} className="bg-transparent outline-none">
              <option value="never">keep</option>
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
            </select>
          </label>
          <button onClick={onOpenMoments} className="ml-auto flex items-center gap-1 text-[11px] text-ink-soft/60">
            <Pencil size={12} /> chalk studio
          </button>
        </div>
        {status && <p className="mt-1 px-1 text-[11px] text-dust-pink">{status}</p>}
      </div>
    </div>
  );
}

function ChatItem({
  board, circleId, onReply, onEdit, onDelete, onReact, onOpenMoments,
}: {
  board: ChatBoard; circleId: string; onReply: () => void; onEdit: () => void;
  onDelete: () => void; onReact: () => void; onOpenMoments: () => void;
}) {
  const mine = board.sender.id === board.currentUserId;
  if (board.locked) return null;
  return (
    <div className={clsx("group flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && board.sender.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={board.sender.image} alt="" className="mt-auto h-7 w-7 rounded-lg object-cover" />
      )}
      <div className={clsx("max-w-[82%]", mine && "items-end")}>
        {board.replyTo && (
          <p className="mb-1 truncate px-2 text-[10px] text-ink-soft/50">
            ↪ {board.replyTo.sender.name || "Someone"}: {board.replyTo.caption || board.replyTo.kind}
          </p>
        )}
        {board.kind === "text" ? (
          <div className={clsx("rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-sm", mine ? "rounded-br-md bg-ink text-paper" : "rounded-bl-md bg-card text-ink ring-1 ring-line")}>
            <p className="whitespace-pre-wrap break-words">{board.caption}</p>
          </div>
        ) : board.kind === "photo" || board.kind === "voice" ? (
          <ChatMedia circleId={circleId} board={board} mine={mine} />
        ) : (
          <button onClick={onOpenMoments} className="block w-52 overflow-hidden rounded-2xl text-left shadow-sm ring-1 ring-line">
            <div className="aspect-square" style={{ backgroundColor: BOARD_COLORS[board.boardColor] }}>
              <BoardPlayback drawing={board.drawing} boardColorHex={BOARD_COLORS[board.boardColor]} className="h-full w-full" />
            </div>
            <span className="block bg-card px-3 py-2 text-xs text-ink-soft">Open chalk moment</span>
          </button>
        )}
        <div className={clsx("mt-1 flex items-center gap-2 px-1 text-[10px] text-ink-soft/45", mine && "justify-end")}>
          <span>{new Date(board.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {board.editedAt && <span>edited</span>}
          {mine && board.seenCount > 0 && <span>seen</span>}
          {board.silent && <BellOff size={10} />}
          <button onClick={onReply}><Reply size={11} /></button>
          <button onClick={onReact}><Heart size={11} /></button>
          {mine && board.kind === "text" && <button onClick={onEdit}><Pencil size={11} /></button>}
          {mine && <button onClick={onDelete}><Trash2 size={11} /></button>}
        </div>
      </div>
    </div>
  );
}

function ChatMedia({ circleId, board, mine }: { circleId: string; board: ChatBoard; mine: boolean }) {
  const [media, setMedia] = useState<BoardMedia | null>(null);
  useEffect(() => {
    fetch(`/api/boards/${circleId}/${board.id}/media`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setMedia(data.media))
      .catch(() => {});
  }, [board.id, circleId]);
  if (board.kind === "photo") {
    return media?.dataUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={media.dataUrl} alt="Shared snap" className={clsx("max-h-80 w-60 rounded-2xl object-cover shadow-sm", mine ? "rounded-br-md" : "rounded-bl-md")} />
    ) : <div className="h-56 w-56 animate-pulse rounded-2xl bg-ink/5" />;
  }
  return (
    <div className={clsx("flex min-w-56 items-center gap-2 rounded-2xl p-3", mine ? "bg-ink text-paper" : "bg-card text-ink ring-1 ring-line")}>
      <Volume2 size={17} />
      {media?.dataUrl ? <audio controls src={media.dataUrl} className="h-8 min-w-0 flex-1" /> : <span className="text-xs">Loading voice…</span>}
    </div>
  );
}

async function compressPhoto(file: File) {
  if (file.size > 20_000_000) throw new Error("Too large");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = reject;
      next.src = url;
    });
    const scale = Math.min(1, 960 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
    if (!blob) throw new Error("Compression failed");
    return blobToDataUrl(blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
