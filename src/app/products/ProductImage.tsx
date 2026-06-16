"use client";

export default function ProductImage({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      className="w-full h-full object-cover"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
