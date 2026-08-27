import React from 'react'

export default function ImageCard3D({ src, alt, className = '', caption }) {
  return (
    <figure className={`img-frame group ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      {caption && (
        <figcaption className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#0b1f3a]/85 via-[#0b1f3a]/30 to-transparent">
          <p className="text-sm font-medium text-white">{caption}</p>
        </figcaption>
      )}
    </figure>
  )
}
