import Image from "next/image";

/*
 * Optimised remote photo. width/height only seed the srcset and placeholder ratio;
 * the "nimg" rule in globals.css keeps the natural ratio unless a stylesheet sizes the image.
 */
export default function Photo({src, alt, priority = false, sizes = "(max-width: 700px) 100vw, 60vw", className}: {src: string; alt: string; priority?: boolean; sizes?: string; className?: string}) {
  return <Image src={src} alt={alt} width={1200} height={800} sizes={sizes} priority={priority} className={className}/>;
}
