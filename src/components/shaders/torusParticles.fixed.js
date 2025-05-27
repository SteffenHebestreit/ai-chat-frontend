// Shader for torus particles - Fixed version
export const vertexShader = `
  // color and position are already defined by Three.js
  // attribute vec3 color;
  // attribute vec3 position;
  attribute float particleAngle;   // Initial angle
  attribute float particleRadius;  // Initial radius
  attribute float particlePhase;   // Random phase offset
  attribute float particleDriftZ;  // Current drifting Z position, updated by CPU
  attribute float particleZOffset; // Static Z offset
  attribute float particleIsNode;  // Whether this is a node (0 or 1)
  attribute float particlePulseIntensity; // Current pulse intensity
  attribute vec3 particlePosition; // Original base position for the particle
  
  uniform float uTime;
  uniform float uDeltaTime;
  uniform float uPortalSpeedFactor;
  uniform float uBreatheSpeed;
  // uDriftSpeed is no longer used by the shader directly for particleDriftZ update
  uniform float uRadialWaveSpeed;
  uniform float uZWaveSpeed;
  uniform float uParticleOpacity;
  uniform vec3 uPulseColor;
  uniform vec3 uPortalColorNear;
  uniform vec3 uPortalColorFar;
    // Constants
  const float PORTAL_DEPTH = 1.0;
  const float AXIAL_PULSE_AMPLITUDE = 0.15;
  const float RADIAL_PULSE_AMPLITUDE = 0.15;
  const float SNAKE_EYE_SCALE_X = 0.8;
  const float SNAKE_EYE_SCALE_Y = 1.35;
  const float RADIAL_WAVE_FREQUENCY = 66.0;
  const float RADIAL_WAVE_AMPLITUDE = 0.18;
  const float Z_WAVE_FREQUENCY = 3.0;
  const float Z_WAVE_AMPLITUDE = 0.2;
  // Enhanced brightness constants
  const float COLOR_INTENSITY_BOOST = 1.4; // Boost color intensity by 40%
  const float NODE_COLOR_INTENSITY_BOOST = 1.6; // Boost node color intensity by 60%
  const float DEPTH_COLOR_CONTRAST = 1.2; // Increase depth color contrast
  
  varying vec3 vColor;
  varying float vOpacity;
  
  void main() {
    // Use particleDriftZ directly as it's updated by the CPU.
    // The shader no longer calculates drift independently.
    float currentDriftingZ = particleDriftZ;
    
    // Calculate breathing effect
    float breatheFactor = 0.0;
    if (uBreatheSpeed > 0.0) {
      breatheFactor = sin(uTime * uBreatheSpeed + particlePhase);
    }
    
    // Wave morphing
    float radialWaveOffset = uTime * uRadialWaveSpeed;
    float angleWaveComponent = sin(particleAngle * RADIAL_WAVE_FREQUENCY + radialWaveOffset);
    float dynamicRadius = particleRadius + angleWaveComponent * RADIAL_WAVE_AMPLITUDE;
    float pulsedRadius = dynamicRadius + breatheFactor * RADIAL_PULSE_AMPLITUDE;
    
    // Base position in torus
    float x_base = cos(particleAngle) * pulsedRadius;
    float y_base = sin(particleAngle) * pulsedRadius;
    
    // Apply snake-eye scaling
    float finalX = x_base * SNAKE_EYE_SCALE_X;
    float finalY = y_base * SNAKE_EYE_SCALE_Y;
    
    // Z-wave and final Z position
    float zWaveOffset = uTime * uZWaveSpeed;
    float zAngleWaveComponent = sin(particleAngle * Z_WAVE_FREQUENCY + zWaveOffset + particlePhase * 0.5);
    float waveZ = zAngleWaveComponent * Z_WAVE_AMPLITUDE;
    float finalZ = currentDriftingZ + particleZOffset + breatheFactor * AXIAL_PULSE_AMPLITUDE + waveZ;
    
    // Final position
    vec3 finalPosition = vec3(finalX, finalY, finalZ);
    
    // Pass the opacity to fragment shader
    vOpacity = uParticleOpacity;
      // Color calculation based on z-depth and pulse intensity
    if (particleIsNode > 0.5) {
      // Enhanced node color with intensity boost
      vColor = vec3(1.0, 0.67, 0.0) * NODE_COLOR_INTENSITY_BOOST; // Brighter node color
      
      // Add a slight pulse effect to nodes for more dynamic lighting
      float nodePulse = sin(uTime * 2.0 + particlePhase) * 0.2 + 0.8;
      vColor *= nodePulse;
    } else {
      // Enhanced Z-depth based color (portal effect)
      float colorCycleLength = PORTAL_DEPTH;
      float colorCycleOffset = -PORTAL_DEPTH / 2.0;
      float normalizedZPeriodic = (finalZ - colorCycleOffset) / colorCycleLength;
      normalizedZPeriodic = normalizedZPeriodic - floor(normalizedZPeriodic);
      
      // Enhanced color mixing with improved contrast
      float enhancedNormalizedZ = pow(normalizedZPeriodic, DEPTH_COLOR_CONTRAST);
      
      // Lerp between far and near portal colors with enhanced brightness
      vColor = mix(uPortalColorFar, uPortalColorNear, enhancedNormalizedZ) * COLOR_INTENSITY_BOOST;
      
      // Apply pulse effect by lerping towards pulse color based on intensity with enhanced brightness
      vColor = mix(vColor, uPulseColor * 1.2, particlePulseIntensity);
      
      // Add subtle breathing luminosity
      float breathLuminosity = breatheFactor * 0.15 + 1.0;
      vColor *= breathLuminosity;
    }// Set the final position
    vec4 mvPosition = modelViewMatrix * vec4(finalPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = 3.5; // Increased from 2.5 for more visible and brighter particles
  }
`;

export const fragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  
  void main() {
    // Create a stronger glow effect for particles
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(gl_PointCoord, center);
    
    // Enhanced color brightness
    vec3 brightColor = vColor * 1.4; // Increase color intensity by 40%
    
    // Improved glow effect with smoother falloff and higher intensity
    float glowFactor = 1.5 - dist * 1.5;
    glowFactor = max(0.0, glowFactor);
    float glowStrength = 2.0; // Increased glow strength
    
    // Combine for a brighter effect with softer edges
    vec3 finalColor = brightColor * glowFactor * glowStrength;
    float alpha = vOpacity * smoothstep(1.0, 0.0, dist * 1.8); // Slightly wider glow
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;
