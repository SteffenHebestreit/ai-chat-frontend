// Shader for neural sphere particles - Fixed version
export const vertexShader = `
  // color and position are already defined by Three.js
  // attribute vec4 color; // RGBA
  // attribute vec3 position;
  attribute float shimmerData;
  
  uniform float uTime;
  uniform float uDeltaTime;
  uniform float uNeuralSpherePulseSpeed;
  uniform float uNeuralSpherePulseAmount;
  uniform float uNeuralSphereShimmerSpeed;
  uniform vec3 uNeuralSphereColor;
  uniform float uNeuralSphereOpacity;
  
  // Constants
  const float NEURAL_SPHERE_SHIMMER_INTENSITY = 0.5; // Increased from 0.3
  const float NEURAL_SPHERE_SHIMMER_COLOR_FACTOR = 0.4; // Increased from 0.3
  const float NEURAL_SPHERE_POP_THRESHOLD = 0.8; // Lower threshold to trigger more pops
  const float NEURAL_SPHERE_POP_COLOR_LERP_FACTOR = 0.8; // More color shift
  const float NEURAL_SPHERE_POP_OPACITY_BOOST = 0.4; // More opacity boost
  
  varying vec4 vColor;
  
  void main() {
    // Get the shimmer value for this particle
    float shimmerPhase = shimmerData;
    float shimmerValue = (sin(uTime * uNeuralSphereShimmerSpeed + shimmerPhase) + 1.0) / 2.0; // 0 to 1
    
    // Start with base color
    vec3 particleColor = uNeuralSphereColor;
    float particleOpacity = uNeuralSphereOpacity;
    
    // 1. Enhanced base shimmer brightness
    float baseBrightnessFactor = 1.0 - NEURAL_SPHERE_SHIMMER_INTENSITY + shimmerValue * NEURAL_SPHERE_SHIMMER_INTENSITY * 1.3;
    particleColor *= baseBrightnessFactor;
    
    // 2. Enhanced shimmer color shift towards white
    float colorShiftAmount = shimmerValue * NEURAL_SPHERE_SHIMMER_COLOR_FACTOR * 1.2;
    vec3 shimmerAdjustedColor = mix(particleColor, vec3(1.0, 1.0, 1.0), colorShiftAmount);
    
    // 3. "Pop" effect calculation with enhanced intensity
    float popIntensity = 0.0;
    if (shimmerValue > NEURAL_SPHERE_POP_THRESHOLD) {
      popIntensity = (shimmerValue - NEURAL_SPHERE_POP_THRESHOLD) / (1.0 - NEURAL_SPHERE_POP_THRESHOLD);
      // Enhance pop intensity
      popIntensity = pow(popIntensity, 0.8); // Makes pop effect more pronounced
    }
      // Apply pop effect if applicable
    if (popIntensity > 0.0) {
      // Color lerp towards bright white with enhanced brightness
      shimmerAdjustedColor = mix(shimmerAdjustedColor, vec3(1.3, 1.3, 1.3), popIntensity * NEURAL_SPHERE_POP_COLOR_LERP_FACTOR);
      
      // Enhanced opacity boost
      particleOpacity = min(1.0, uNeuralSphereOpacity + popIntensity * NEURAL_SPHERE_POP_OPACITY_BOOST);
    }
    
    // Add pulse effect for additional brightness
    float pulseEffect = sin(uTime * uNeuralSpherePulseSpeed) * 0.5 + 0.5; // 0 to 1
    shimmerAdjustedColor = mix(shimmerAdjustedColor, shimmerAdjustedColor * 1.5, pulseEffect * uNeuralSpherePulseAmount);
    
    // Set varying color and opacity for fragment shader
    vColor = vec4(shimmerAdjustedColor, particleOpacity);// Position calculation
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Calculate size with attenuation - increased for more visibility and brightness
    float size = 0.08; // Increased from 0.05 for brighter, more prominent particles
    gl_PointSize = size * (300.0 / -mvPosition.z);
  }
`;

export const fragmentShader = `
  varying vec4 vColor;
  
  void main() {
    // Create an enhanced, more intense glow effect
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(gl_PointCoord, center);
    
    // Enhance brightness
    vec3 brightColor = vColor.rgb * 1.5; // Increase color intensity by 50%
    
    // Apply more pronounced radial falloff for stronger glow effect
    float glowFactor = 1.0 - dist * 1.2;
    glowFactor = pow(max(0.0, glowFactor), 1.2); // Sharpen the glow slightly
    float glowStrength = 2.2; // Stronger glow
    
    // Combine for a brighter effect
    vec3 finalColor = brightColor * glowFactor * glowStrength;
    float alpha = vColor.a * smoothstep(0.5, 0.1, dist); // Wider glow radius
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;
