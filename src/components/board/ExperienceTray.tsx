"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Clock3,
  Eye,
  Gift,
  Mic,
  Sparkles,
  StopCircle,
  WandSparkles,
} from "lucide-react";
import clsx from "clsx";
import type { BoardExperience, BoardMedia } from "@/types/chalk";

export const DAILY_PROMPTS = [
  "Draw your mood without using words",
  "One tiny thing I love about you",
  "Complete this doodle ✨",
  "Our dream date in 3 lines",
  "A memory I want to replay",
  "Draw what you need today",
];

const GIFTS = ["💐", "☕", "🫂", "🎟️", "🍫", "💌"];

export const EMPTY_EXPERIENCE: BoardExperience = {
  kind: "chalk",
  deliveryMode: "normal",
  unlockAt: "",
  expiresIn: "never",
  viewOnce: false,
  prompt: "",
  gift: "",
  media: null,
};

type Props = {
  value: BoardExperience;
  onChange: (next: BoardExperience) => void;
};

function updateMedia(
  value: BoardExperience,
  onChange: Props["onChange"],
  media: BoardMedia | null
) {
  onChange({
    ...value,
    media,
    kind: media?.type ?? (value.gift ? "gift" : value.prompt ? "prompt" : "chalk"),
  });
}

export function ExperienceTray({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(
    () => () => {
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    },
    []
  );

  async function choosePhoto(file?: File) {
    if (!file) return;
    if (file.size > 20_000_000) {
      setMessage("Choose a photo under 20 MB.");
      return;
    }
    setMessage("Optimizing photo…");
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const next = new Image();
        next.onload = () => resolve(next);
        next.onerror = reject;
        next.src = url;
      });
      const size = 960;
      const scale = Math.min(1, size / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.7)
      );
      if (!blob) throw new Error("Could not compress image");
      const dataUrl = await blobToDataUrl(blob);
      updateMedia(value, onChange, {
        type: "photo",
        dataUrl,
        name: file.name,
        bytes: blob.size,
      });
      setMessage(`Photo ready · ${Math.max(1, Math.round(blob.size / 1024))} KB`);
    } catch {
      setMessage("Couldn’t prepare that photo. Try another image.");
    } finally {
      URL.revokeObjectURL(url);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
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
      startedAt.current = Date.now();
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = () => {
        if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setRecording(false);
        if (blob.size > 900_000) {
          setMessage("Voice scribble was too large. Keep it under 2 minutes.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          updateMedia(value, onChange, {
            type: "voice",
            dataUrl: String(reader.result),
            duration: Math.round((Date.now() - startedAt.current) / 1000),
            bytes: blob.size,
          });
          setMessage(
            `Voice scribble ready · ${Math.round((Date.now() - startedAt.current) / 1000)}s`
          );
        };
        reader.readAsDataURL(blob);
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 120_000);
      setRecording(true);
      setMessage("Recording… tap stop, max 2 minutes");
    } catch {
      setMessage("Microphone permission is needed for voice scribbles.");
    }
  }

  const set = (patch: Partial<BoardExperience>) => onChange({ ...value, ...patch });

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-chalk-white">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-chalk-white/55">
          <WandSparkles size={14} /> Make it personal
        </p>
        {(value.media || value.gift || value.prompt) && (
          <button type="button" onClick={() => onChange(EMPTY_EXPERIENCE)} className="text-xs text-chalk-white/45">
            Reset extras
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <MiniButton icon={<Camera size={15} />} label="Photo" active={value.media?.type === "photo"} onClick={() => fileRef.current?.click()} />
        <MiniButton icon={recording ? <StopCircle size={15} /> : <Mic size={15} />} label={recording ? "Stop" : "Voice"} active={recording || value.media?.type === "voice"} onClick={toggleRecording} />
        <MiniButton icon={<Gift size={15} />} label="Gift" active={!!value.gift} onClick={() => set({ gift: value.gift ? "" : "💐", kind: value.gift ? "chalk" : "gift" })} />
        <MiniButton icon={<Sparkles size={15} />} label="Prompt" active={!!value.prompt} onClick={() => set({ prompt: value.prompt ? "" : DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)], kind: value.prompt ? "chalk" : "prompt" })} />
      </div>
      <input ref={fileRef} hidden type="file" accept="image/*" onChange={(event) => choosePhoto(event.target.files?.[0])} />

      {value.media?.type === "photo" && value.media.dataUrl && (
        <div className="flex items-center gap-3 rounded-xl bg-black/20 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.media.dataUrl} alt="Attached preview" className="h-14 w-14 rounded-lg object-cover" />
          <p className="flex-1 text-xs text-chalk-white/65">Photo ready—your drawing becomes its handwritten frame.</p>
          <button type="button" onClick={() => updateMedia(value, onChange, null)} className="px-2 text-xs">Remove</button>
        </div>
      )}
      {value.media?.type === "voice" && value.media.dataUrl && (
        <div className="flex items-center gap-3 rounded-xl bg-black/20 p-2">
          <span className="text-xl">〰️</span>
          <audio controls src={value.media.dataUrl} className="h-8 min-w-0 flex-1" />
          <button type="button" onClick={() => updateMedia(value, onChange, null)} className="px-2 text-xs">×</button>
        </div>
      )}
      {!!value.gift && (
        <div className="flex items-center gap-2">
          {GIFTS.map((gift) => (
            <button key={gift} type="button" onClick={() => set({ gift, kind: "gift" })} className={clsx("h-10 w-10 rounded-xl text-xl", value.gift === gift ? "bg-chalk-amber/25 ring-1 ring-chalk-amber" : "bg-white/5")}>
              {gift}
            </button>
          ))}
          <span className="text-xs text-chalk-white/45">digital little something</span>
        </div>
      )}
      {!!value.prompt && (
        <button type="button" onClick={() => set({ prompt: DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)] })} className="w-full rounded-xl bg-chalk-amber/10 p-3 text-left text-sm text-chalk-amber">
          “{value.prompt}” <span className="ml-1 text-xs opacity-60">tap to shuffle</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SelectTile label="Normal" active={value.deliveryMode === "normal"} onClick={() => set({ deliveryMode: "normal", unlockAt: "" })} />
        <SelectTile label="Rub to reveal" active={value.deliveryMode === "secret"} onClick={() => set({ deliveryMode: "secret", unlockAt: "" })} />
        <SelectTile label="Time capsule" active={value.deliveryMode === "capsule"} onClick={() => set({ deliveryMode: "capsule", unlockAt: value.unlockAt || new Date(Date.now() + 86_400_000).toISOString().slice(0, 16) })} />
        <SelectTile label="Open when…" active={value.deliveryMode === "open-when"} onClick={() => set({ deliveryMode: "open-when", unlockAt: value.unlockAt || new Date(Date.now() + 86_400_000).toISOString().slice(0, 16), prompt: value.prompt || "Open when you miss me" })} />
      </div>

      {(value.deliveryMode === "capsule" || value.deliveryMode === "open-when") && (
        <label className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-xs text-chalk-white/65">
          <Clock3 size={14} />
          Unlock
          <input type="datetime-local" value={value.unlockAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => set({ unlockAt: event.target.value })} className="min-w-0 flex-1 bg-transparent text-chalk-white outline-none" />
        </label>
      )}
      {value.deliveryMode === "open-when" && (
        <input
          value={value.prompt}
          onChange={(event) => set({ prompt: event.target.value })}
          placeholder="Open when you miss me…"
          maxLength={180}
          className="w-full rounded-xl bg-black/20 px-3 py-2.5 text-sm text-chalk-white outline-none placeholder:text-chalk-white/35"
        />
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-2">
          <Clock3 size={13} /> disappears
          <select value={value.expiresIn} onChange={(event) => set({ expiresIn: event.target.value as BoardExperience["expiresIn"] })} className="bg-transparent text-chalk-white outline-none">
            <option className="text-black" value="never">never</option>
            <option className="text-black" value="1h">in 1 hour</option>
            <option className="text-black" value="24h">in 24 hours</option>
            <option className="text-black" value="7d">in 7 days</option>
          </select>
        </label>
        <button type="button" onClick={() => set({ viewOnce: !value.viewOnce })} className={clsx("flex items-center gap-2 rounded-full px-3 py-2", value.viewOnce ? "bg-dust-pink/25 text-dust-pink" : "bg-black/20")}>
          <Eye size={13} /> view once
        </button>
      </div>
      {message && <p className="text-xs text-chalk-white/50">{message}</p>}
    </section>
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function MiniButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={clsx("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs", active ? "bg-chalk-amber text-slate-950" : "bg-black/20 text-chalk-white/70")}>{icon}{label}</button>;
}

function SelectTile({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={clsx("rounded-xl px-2 py-2.5 text-xs", active ? "bg-chalk-mint/20 text-chalk-mint ring-1 ring-chalk-mint/40" : "bg-black/20 text-chalk-white/55")}>{label}</button>;
}
