import Image from "next/image";

export function Hero() {
  return (
    <div className="relative">
      <Image
        src="/images/hero-community.PNG"
        alt=""
        width={1200}
        height={800}
        className="w-full h-auto"
        priority
      />

      <div
        className="
          absolute inset-y-0 left-0
          w-48
          bg-gradient-to-r
          from-white
          to-transparent
        "
      />
    </div>
  );
}