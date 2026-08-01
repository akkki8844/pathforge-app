import { motion } from 'framer-motion';

interface AdvisorAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AdvisorAvatar({ 
  isSpeaking, 
  isListening, 
  isProcessing,
  size = 'lg' 
}: AdvisorAvatarProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  const innerSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Outer glow ring - always visible but pulses when active */}
      <motion.div
        className="absolute inset-0 rounded-full bg-accent/20"
        animate={{
          scale: isSpeaking ? [1, 1.15, 1] : isListening ? [1, 1.1, 1] : 1,
          opacity: isSpeaking || isListening ? [0.3, 0.5, 0.3] : 0.2,
        }}
        transition={{
          duration: isSpeaking ? 0.5 : 0.8,
          repeat: isSpeaking || isListening ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />

      {/* Middle ring - visible when speaking */}
      {isSpeaking && (
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-accent/40"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Main avatar circle */}
      <motion.div
        className={`${innerSizeClasses[size]} rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg`}
        animate={{
          scale: isProcessing ? [1, 0.95, 1] : 1,
        }}
        transition={{
          duration: 1,
          repeat: isProcessing ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        {/* Inner waveform bars - animate when speaking */}
        <div className="flex items-center justify-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-accent-foreground rounded-full"
              style={{
                width: size === 'lg' ? 3 : size === 'md' ? 2.5 : 2,
              }}
              animate={{
                height: isSpeaking 
                  ? [8, 20 + Math.random() * 12, 8, 16 + Math.random() * 8, 8]
                  : isListening
                  ? [6, 12, 6]
                  : isProcessing
                  ? [4, 8, 4]
                  : 8,
              }}
              transition={{
                duration: isSpeaking ? 0.3 : 0.5,
                repeat: (isSpeaking || isListening || isProcessing) ? Infinity : 0,
                delay: i * 0.05,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Listening indicator ring */}
      {isListening && (
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-destructive/50"
          animate={{
            scale: [1, 1.2],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}
    </div>
  );
}
