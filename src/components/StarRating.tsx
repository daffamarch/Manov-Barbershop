"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Star } from "lucide-react"

interface StarRatingProps {
  onRatingSelect: (rating: number) => void
  disabled?: boolean
}

export function StarRating({ onRatingSelect, disabled = false }: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = React.useState(0)
  const [selectedRating, setSelectedRating] = React.useState(0)

  const handleSelect = (star: number) => {
    setSelectedRating(star)
    onRatingSelect(star)
  }

  return (
    <div className="flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-4 max-w-full overflow-hidden">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          disabled={disabled}
          whileHover={{ scale: disabled ? 1 : 1.15 }}
          whileTap={{ scale: disabled ? 1 : 0.9 }}
          onMouseEnter={() => !disabled && setHoveredRating(star)}
          onMouseLeave={() => !disabled && setHoveredRating(0)}
          onClick={() => !disabled && handleSelect(star)}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full p-0.5"
        >
          <Star
            className={`h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 transition-colors duration-200 ${
              (hoveredRating ? star <= hoveredRating : star <= selectedRating)
                ? "fill-emerald-400 text-emerald-400"
                : "fill-gray-100 text-gray-300"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          />
        </motion.button>
      ))}
    </div>
  )
}
