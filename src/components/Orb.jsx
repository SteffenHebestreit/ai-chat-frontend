import React, { useRef, useMemo, useState, useEffect } from 'react'; // Added useState, useEffect
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { vertexShader as torusVertexShader, fragmentShader as torusFragmentShader } from './shaders/torusParticles.fixed';
import { vertexShader as neuralSphereVertexShader, fragmentShader as neuralSphereFragmentShader } from './shaders/neuralSphereParticles.fixed';

// Portal/Torus Configuration
const PARTICLE_COUNT = 3000;
const OUTER_RADIUS = 0.95;
const INNER_RADIUS = 0.55;
const AXIAL_PULSE_AMPLITUDE = 0.15;
const RADIAL_PULSE_AMPLITUDE = 0.15;
const PORTAL_DEPTH = 1.0;
const Z_DRIFT_SPEED = 0.1;
const SNAKE_EYE_SCALE_X = 0.8;
const SNAKE_EYE_SCALE_Y = 1.35;
const RADIAL_WAVE_FREQUENCY = 66.0;
const RADIAL_WAVE_AMPLITUDE = 0.18;
const RADIAL_WAVE_SPEED = 0.75;
const Z_WAVE_FREQUENCY = 3.0;
const Z_WAVE_AMPLITUDE = 0.2;
const Z_WAVE_SPEED = 0.6;
// Enhanced bright colors
const COLOR_NEAR = new THREE.Color('#00ffff').multiplyScalar(1.5); // Brighter cyan
const COLOR_FAR = new THREE.Color('#4a00e0').multiplyScalar(1.3); // Brighter purple
const BASE_BREATHE_SPEED = 0.5;
const BASE_PARTICLE_OPACITY = 0.9; // Increased from 0.8 for more visibility

// Constants for the Neural Pulse effect
const NUM_NODES = 10; // Number of 'neural nodes' on the torus
const NODE_COLOR = new THREE.Color(0xffaa00).multiplyScalar(1.4); // Brighter node color
const PULSE_COLOR = new THREE.Color(0xffffff); // Color of the pulses
const PULSE_SPEED = 2.5; // How fast pulses travel
const PULSE_WIDTH = 0.83; // Width of the pulse wave
const PULSE_MAX_TRAVEL_RADIUS = OUTER_RADIUS * 4.5; // Max distance a pulse travels
const MAX_ACTIVE_PULSES = 9; // Max number of concurrent pulses
const PULSE_GENERATION_INTERVAL_MIN = 0.5; // Minimum seconds between new pulses
const PULSE_GENERATION_INTERVAL_MAX = 2.0; // Maximum seconds between new pulses


// Neural Sphere Configuration
const ENABLE_NEURAL_SPHERE = true; // Master toggle for the neural sphere
const NEURAL_SPHERE_RADIUS = 0.4; // Increased from 0.35 for larger, more visible sphere
const NEURAL_SPHERE_PARTICLE_COUNT = 400; // Increased from 300 for more particles and brighter effect
const NEURAL_SPHERE_BASE_COLOR = new THREE.Color(0x8888ff).multiplyScalar(1.4); // Brighter light blue/purple
const NEURAL_SPHERE_ACTIVITY_COLOR = new THREE.Color(0xffffff); // Already bright white for activity
const NEURAL_SPHERE_ERROR_COLOR = new THREE.Color(0xff3333).multiplyScalar(1.3); // Brighter red for error
const NEURAL_SPHERE_OUTPUT_COLOR = new THREE.Color(0x33ff66).multiplyScalar(1.5); // Bright green for output state
const NEURAL_SPHERE_BASE_OPACITY = 0.9; // Increased from 0.8 for more visibility
const NEURAL_SPHERE_ACTIVITY_OPACITY = 1.0; // Already at maximum
const NEURAL_SPHERE_ERROR_OPACITY = 0.7; // Increased from 0.6
const NEURAL_SPHERE_OUTPUT_OPACITY = 1.0; // Full opacity for output state
const NEURAL_SPHERE_BASE_PULSE_AMOUNT = 0.12; // Increased from 0.08 for more visible pulsing
const NEURAL_SPHERE_ACTIVITY_PULSE_AMOUNT = 0.25; // Increased from 0.2
const NEURAL_SPHERE_ERROR_PULSE_AMOUNT = 0.06; // Increased from 0.04
const NEURAL_SPHERE_OUTPUT_PULSE_AMOUNT = 0.3; // Strong pulse for output state
const NEURAL_SPHERE_PULSE_SPEED = 1.2; // Increased from 1.0 for faster, more visible pulsing
const NEURAL_SPHERE_SHIMMER_SPEED = 1.8; // Increased from 1.5 for faster shimmer
const NEURAL_SPHERE_ERROR_SCALE = 1.15; // Scale factor for error state (15% growth)

// --- BEGIN REFINEMENT CONSTANTS ---
const NEURAL_SPHERE_ROTATION_SPEED = 0.41; // Radians per second for Y-axis rotation
// --- END REFINEMENT CONSTANTS ---

const TRANSITION_DURATION = 1.1; // Seconds for state transitions (Increased from 0.75)

// AI State Modifiers - Enhanced for brightness
const AI_STATE_MODIFIERS = {
  default: { 
    portalSpeedFactor: 1.0, pulseSpeedFactor: 0.8, pulseRateFactor: 0.6, 
    particleOpacity: BASE_PARTICLE_OPACITY, 
    // Null overrides use the enhanced base colors defined earlier
    pulseColorOverride: null, portalColorNearOverride: null, portalColorFarOverride: null,
    neuralSphereColor: NEURAL_SPHERE_BASE_COLOR, neuralSphereOpacity: NEURAL_SPHERE_BASE_OPACITY, neuralSpherePulseAmount: NEURAL_SPHERE_BASE_PULSE_AMOUNT,
    pulsesFromCenter: false, // Default pulse origin behavior
    neuralSphereScale: 1.0, // Default scale
    frozenAnimation: false // Animation continues
  },
  activity: { 
    portalSpeedFactor: 1.3, // Increased from 1.2
    pulseSpeedFactor: 1.4, // Increased from 1.2
    pulseRateFactor: 1.8, // Increased from 1.5 for more activity
    particleOpacity: BASE_PARTICLE_OPACITY + 0.1, // Using new higher base opacity
    // Enhanced bright colors with multiplyScalar for more luminosity
    pulseColorOverride: new THREE.Color(0xffffff).multiplyScalar(1.2), // Super bright white pulses
    portalColorNearOverride: new THREE.Color(0xffff33).multiplyScalar(1.3), // Brighter yellow
    portalColorFarOverride: new THREE.Color(0xffaa00).multiplyScalar(1.2), // Brighter orange-yellow
    neuralSphereColor: NEURAL_SPHERE_ACTIVITY_COLOR.clone().multiplyScalar(1.2), // Even brighter neural sphere
    neuralSphereOpacity: NEURAL_SPHERE_ACTIVITY_OPACITY,
    neuralSpherePulseAmount: NEURAL_SPHERE_ACTIVITY_PULSE_AMOUNT,
    pulsesFromCenter: false, // Default pulse origin behavior
    neuralSphereScale: 1.0, // Default scale
    frozenAnimation: false // Animation continues
  },
  // New state: AI is outputting data
  output: {
    portalSpeedFactor: 1.4, // Faster than activity
    pulseSpeedFactor: 1.6, // Faster pulses
    pulseRateFactor: 2.0, // More frequent pulses
    particleOpacity: BASE_PARTICLE_OPACITY + 0.15, // Higher opacity for more visibility
    // Green-themed colors for output state
    pulseColorOverride: new THREE.Color(0xffb300).multiplyScalar(1.4), // Bright green pulses
    portalColorNearOverride: new THREE.Color(0x00ffaa).multiplyScalar(1.4), // Bright teal near
    portalColorFarOverride: new THREE.Color(0x00aa44).multiplyScalar(1.3), // Deeper green far
    neuralSphereColor: NEURAL_SPHERE_OUTPUT_COLOR,
    neuralSphereOpacity: NEURAL_SPHERE_OUTPUT_OPACITY,
    neuralSpherePulseAmount: NEURAL_SPHERE_OUTPUT_PULSE_AMOUNT,
    pulsesFromCenter: true, // Pulses originate from center/sphere
    neuralSphereScale: 1.05, // Slightly larger sphere during output
    frozenAnimation: false // Animation continues
  },
  // Enhanced error state
  error: { 
    portalSpeedFactor: 0.3, pulseSpeedFactor: 0.2, pulseRateFactor: 0.1, 
    particleOpacity: BASE_PARTICLE_OPACITY - 0.2, // Less opacity reduction since base is higher
    // Enhanced error colors
    pulseColorOverride: new THREE.Color(0xff0000).multiplyScalar(1.4), // Brighter red pulses
    portalColorNearOverride: new THREE.Color(0x8B0000).multiplyScalar(1.2), // Brighter dark red
    portalColorFarOverride: new THREE.Color(0x3d0000).multiplyScalar(1.1), // Slightly brighter deep red
    neuralSphereColor: NEURAL_SPHERE_ERROR_COLOR,
    neuralSphereOpacity: NEURAL_SPHERE_ERROR_OPACITY,
    neuralSpherePulseAmount: NEURAL_SPHERE_ERROR_PULSE_AMOUNT,
    pulsesFromCenter: false, // Default pulse origin behavior
    neuralSphereScale: 1.0, // Default scale (we'll handle special error expansion separately)
    frozenAnimation: false // Animation continues
  },
  // Special severe error state with expanded particles and frozen sphere
  criticalError: {
    portalSpeedFactor: 0.1, // Very slow portal movement
    pulseSpeedFactor: 0.05, // Almost no pulse movement
    pulseRateFactor: 0.05, // Very few pulses
    particleOpacity: BASE_PARTICLE_OPACITY, // Full opacity for error state
    // Intense red colors
    pulseColorOverride: new THREE.Color(0xff0000).multiplyScalar(1.6), // Very bright red pulses
    portalColorNearOverride: new THREE.Color(0xff2200).multiplyScalar(1.4), // Bright red-orange
    portalColorFarOverride: new THREE.Color(0x660000).multiplyScalar(1.3), // Deep red
    neuralSphereColor: NEURAL_SPHERE_ERROR_COLOR.clone().multiplyScalar(1.2), // Brighter error color
    neuralSphereOpacity: 0.9, // High opacity
    neuralSpherePulseAmount: 0.01, // Almost no pulsing (appears frozen)
    pulsesFromCenter: true, // Particles expand from center
    neuralSphereScale: NEURAL_SPHERE_ERROR_SCALE, // 15% larger sphere
    frozenAnimation: true // Frozen animation
  }
};

// Helper to get resolved visual properties for a state
const getResolvedVisuals = (stateName, basePColor, baseNearColor, baseFarColor) => {
  const modifier = AI_STATE_MODIFIERS[stateName] || AI_STATE_MODIFIERS.default;
  return {
    portalSpeedFactor: modifier.portalSpeedFactor,
    pulseSpeedFactor: modifier.pulseSpeedFactor,
    pulseRateFactor: modifier.pulseRateFactor,
    particleOpacity: modifier.particleOpacity,
    pulseColor: modifier.pulseColorOverride ? new THREE.Color().copy(modifier.pulseColorOverride) : new THREE.Color().copy(basePColor),
    portalColorNear: modifier.portalColorNearOverride ? new THREE.Color().copy(modifier.portalColorNearOverride) : new THREE.Color().copy(baseNearColor),
    portalColorFar: modifier.portalColorFarOverride ? new THREE.Color().copy(modifier.portalColorFarOverride) : new THREE.Color().copy(baseFarColor),
    // Neural Sphere Visuals
    neuralSphereColor: new THREE.Color().copy(modifier.neuralSphereColor),
    neuralSphereOpacity: modifier.neuralSphereOpacity,
    neuralSpherePulseAmount: modifier.neuralSpherePulseAmount,
    // New properties for custom states
    pulsesFromCenter: modifier.pulsesFromCenter || false,
    neuralSphereScale: modifier.neuralSphereScale || 1.0,
    frozenAnimation: modifier.frozenAnimation || false
  };
};

function Orb({ aiState = 'default', ...props }) { 
  // Performance monitoring
  const fpsRef = useRef({ frames: 0, lastMeasured: 0, fps: 0 });
    const pointsRef = useRef();
  const neuralSpherePointsRef = useRef(); // Ref for the neural sphere
  const [activePulses, setActivePulses] = useState([]);
  const [neuralSphereRotation, setNeuralSphereRotation] = useState(0); // Track neural sphere rotation
  const lastPulseGenerationTimeRef = useRef(0);
  const nextPulseIntervalRef = useRef(PULSE_GENERATION_INTERVAL_MIN + Math.random() * (PULSE_GENERATION_INTERVAL_MAX - PULSE_GENERATION_INTERVAL_MIN));

  // Store base colors in a ref to pass to getResolvedVisuals if they are needed before full component init
  const baseColors = useRef({ 
    PULSE_COLOR, 
    COLOR_NEAR, 
    COLOR_FAR,
    // Add neural sphere base color for completeness, though getResolvedVisuals uses its own defaults
    NEURAL_SPHERE_BASE_COLOR 
  });

  const currentVisualsRef = useRef(getResolvedVisuals(aiState, baseColors.current.PULSE_COLOR, baseColors.current.COLOR_NEAR, baseColors.current.COLOR_FAR));
  const transitionInfoRef = useRef({
    sourceVisuals: getResolvedVisuals(aiState, baseColors.current.PULSE_COLOR, baseColors.current.COLOR_NEAR, baseColors.current.COLOR_FAR),
    targetVisuals: getResolvedVisuals(aiState, baseColors.current.PULSE_COLOR, baseColors.current.COLOR_NEAR, baseColors.current.COLOR_FAR),
    startTime: 0,
    progress: 1, // Initially, no transition
  });
  const prevAiStateRef = useRef(aiState);

  useEffect(() => {
    if (prevAiStateRef.current === aiState && transitionInfoRef.current.progress === 1) {
      // No change in aiState or already at target, do nothing
      return;
    }

    const newTargetVisuals = getResolvedVisuals(aiState, baseColors.current.PULSE_COLOR, baseColors.current.COLOR_NEAR, baseColors.current.COLOR_FAR);
    
    transitionInfoRef.current = {
      sourceVisuals: { // Deep copy of current interpolated visuals
        ...currentVisualsRef.current,
        pulseColor: new THREE.Color().copy(currentVisualsRef.current.pulseColor),
        portalColorNear: new THREE.Color().copy(currentVisualsRef.current.portalColorNear),
        portalColorFar: new THREE.Color().copy(currentVisualsRef.current.portalColorFar),
        neuralSphereColor: new THREE.Color().copy(currentVisualsRef.current.neuralSphereColor), // Add neural sphere color
      },
      targetVisuals: newTargetVisuals,
      startTime: -1, // Will be set in useFrame on the first frame of the transition
      progress: 0,
    };
    prevAiStateRef.current = aiState;
  }, [aiState]);

  const nodeIndices = useMemo(() => {
    const indices = new Set();
    // Randomly select NUM_NODES unique particles from the entire pool to be nodes
    while(indices.size < NUM_NODES && indices.size < PARTICLE_COUNT) {
      indices.add(Math.floor(Math.random() * PARTICLE_COUNT));
    }
    return Array.from(indices);
  }, []); // NUM_NODES and PARTICLE_COUNT are const, no need for deps
  
  const { particles } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    
    // Create separate attributes for each data element
    const particleAngles = new Float32Array(PARTICLE_COUNT);
    const particleRadii = new Float32Array(PARTICLE_COUNT);
    const particlePhases = new Float32Array(PARTICLE_COUNT);
    const particleDriftZ = new Float32Array(PARTICLE_COUNT);
    const particleZOffsets = new Float32Array(PARTICLE_COUNT);
    const particleIsNode = new Float32Array(PARTICLE_COUNT);
    const particlePulseIntensities = new Float32Array(PARTICLE_COUNT);
    const particleBasePositions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const isNode = nodeIndices.includes(i);

      // Portal particle initialization
      const initialRadius = INNER_RADIUS + Math.random() * (OUTER_RADIUS - INNER_RADIUS);
      const initialAngle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const initialDriftingZ = (Math.random() - 0.5) * PORTAL_DEPTH;
      const staticZOffsetForPulse = (Math.random() - 0.5) * 0.05;
      
      // Calculate initial base positions (before snake-eye, waves, or drift)
      // These are relative to the torus's local space
      const initialBaseX = Math.cos(initialAngle) * initialRadius;
      const initialBaseY = Math.sin(initialAngle) * initialRadius;
      const initialBaseZ = initialDriftingZ + staticZOffsetForPulse; // A base Z before dynamic effects

      positions[i3] = initialBaseX * SNAKE_EYE_SCALE_X; // Initial position with snake-eye
      positions[i3 + 1] = initialBaseY * SNAKE_EYE_SCALE_Y;
      positions[i3 + 2] = initialBaseZ; // Initial Z before breathing/waves
      
      // Store individual data elements in separate attributes
      particleAngles[i] = initialAngle;
      particleRadii[i] = initialRadius;
      particlePhases[i] = Math.random() * Math.PI * 2; // randomPhaseForBreath
      particleDriftZ[i] = initialDriftingZ;
      particleZOffsets[i] = staticZOffsetForPulse;
      particleIsNode[i] = isNode ? 1.0 : 0.0;
      particlePulseIntensities[i] = 0.0; // currentPulseIntensity
      
      // Store base position
      particleBasePositions[i3] = initialBaseX;
      particleBasePositions[i3 + 1] = initialBaseY;
      particleBasePositions[i3 + 2] = initialBaseZ;

      if (isNode) {
        colors[i3] = NODE_COLOR.r;
        colors[i3 + 1] = NODE_COLOR.g;
        colors[i3 + 2] = NODE_COLOR.b;
      } else {
        // Initial color for non-nodes (will be updated by Z-depth and pulse)
        const tempColor = new THREE.Color();
        const colorCycleLength = PORTAL_DEPTH;
        const colorCycleOffset = -PORTAL_DEPTH / 2;
        let normalizedZPeriodic = (initialBaseZ - colorCycleOffset) / colorCycleLength;
        normalizedZPeriodic = normalizedZPeriodic - Math.floor(normalizedZPeriodic);
        tempColor.copy(COLOR_FAR).lerp(COLOR_NEAR, normalizedZPeriodic);
        colors[i3] = tempColor.r;
        colors[i3 + 1] = tempColor.g;
        colors[i3 + 2] = tempColor.b;
      }
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Add individual data attributes
    particleGeometry.setAttribute('particleAngle', new THREE.BufferAttribute(particleAngles, 1));
    particleGeometry.setAttribute('particleRadius', new THREE.BufferAttribute(particleRadii, 1));
    particleGeometry.setAttribute('particlePhase', new THREE.BufferAttribute(particlePhases, 1));
    particleGeometry.setAttribute('particleDriftZ', new THREE.BufferAttribute(particleDriftZ, 1));
    particleGeometry.setAttribute('particleZOffset', new THREE.BufferAttribute(particleZOffsets, 1));
    particleGeometry.setAttribute('particleIsNode', new THREE.BufferAttribute(particleIsNode, 1));
    particleGeometry.setAttribute('particlePulseIntensity', new THREE.BufferAttribute(particlePulseIntensities, 1));
    particleGeometry.setAttribute('particlePosition', new THREE.BufferAttribute(particleBasePositions, 3));
    
    return { 
      particles: particleGeometry,
      // Expose references to buffer attributes for updates in useFrame
      particleDriftZAttribute: particleGeometry.attributes.particleDriftZ,
      particlePulseIntensityAttribute: particleGeometry.attributes.particlePulseIntensity
    };
  }, [nodeIndices]); // Added nodeIndices dependency

  // --- BEGIN NEURAL SPHERE GEOMETRY ---
  const neuralSphereParticleGeometry = useMemo(() => {
    if (!ENABLE_NEURAL_SPHERE) return null;

    const positions = new Float32Array(NEURAL_SPHERE_PARTICLE_COUNT * 3);
    // RGBA, so 4 components per color
    const colors = new Float32Array(NEURAL_SPHERE_PARTICLE_COUNT * 4); 
    const shimmerData = new Float32Array(NEURAL_SPHERE_PARTICLE_COUNT); 

    const phi = Math.PI * (3. - Math.sqrt(5.));

    for (let i = 0; i < NEURAL_SPHERE_PARTICLE_COUNT; i++) {
      const y = 1 - (i / (NEURAL_SPHERE_PARTICLE_COUNT - 1)) * 2; 
      const radiusAtY = Math.sqrt(1 - y * y); 

      const theta = phi * i; 

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      positions[i * 3] = x * NEURAL_SPHERE_RADIUS;
      positions[i * 3 + 1] = y * NEURAL_SPHERE_RADIUS;
      positions[i * 3 + 2] = z * NEURAL_SPHERE_RADIUS;
      
      // Initial colors (including alpha) will be set dynamically in useFrame.
      // If needed, default alpha could be set here: colors[i * 4 + 3] = NEURAL_SPHERE_BASE_OPACITY;
      
      shimmerData[i] = Math.random() * Math.PI * 2; 
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Use 4 components for color (RGBA)
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4)); 
    geometry.setAttribute('shimmerData', new THREE.BufferAttribute(shimmerData, 1));
    return geometry;
  }, []);  // --- END NEURAL SPHERE GEOMETRY ---

  // Create shader uniforms for torus particles
  const torusUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uDeltaTime: { value: 0 },
    uPortalSpeedFactor: { value: 1.0 },
    uBreatheSpeed: { value: BASE_BREATHE_SPEED },
    // uDriftSpeed: { value: Z_DRIFT_SPEED }, // No longer needed by shader
    uRadialWaveSpeed: { value: RADIAL_WAVE_SPEED },
    uZWaveSpeed: { value: Z_WAVE_SPEED },
    uParticleOpacity: { value: BASE_PARTICLE_OPACITY },
    uPulseColor: { value: new THREE.Color(PULSE_COLOR) },
    uPortalColorNear: { value: new THREE.Color(COLOR_NEAR) },
    uPortalColorFar: { value: new THREE.Color(COLOR_FAR) }
  }), []);

  // Create shader uniforms for neural sphere particles
  const neuralSphereUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uDeltaTime: { value: 0 },
    uNeuralSpherePulseSpeed: { value: NEURAL_SPHERE_PULSE_SPEED },
    uNeuralSpherePulseAmount: { value: NEURAL_SPHERE_BASE_PULSE_AMOUNT },
    uNeuralSphereShimmerSpeed: { value: NEURAL_SPHERE_SHIMMER_SPEED },
    uNeuralSphereColor: { value: new THREE.Color(NEURAL_SPHERE_BASE_COLOR) },
    uNeuralSphereOpacity: { value: NEURAL_SPHERE_BASE_OPACITY }
  }), []);

  useFrame((state, delta) => {
    if (!pointsRef.current || !pointsRef.current.material || 
        (ENABLE_NEURAL_SPHERE && (!neuralSpherePointsRef.current || !neuralSpherePointsRef.current.material))) return;

    const time = state.clock.getElapsedTime();
    const ti = transitionInfoRef.current; // Transition Info
    
/*     // Performance monitoring
    fpsRef.current.frames++;
    if (time - fpsRef.current.lastMeasured >= 1.0) {
      fpsRef.current.fps = Math.round(fpsRef.current.frames / (time - fpsRef.current.lastMeasured));
      fpsRef.current.lastMeasured = time;
      fpsRef.current.frames = 0;
      console.log(`Orb rendering at ${fpsRef.current.fps} FPS`);
    } */
    
    // Update the time and delta uniforms for both shaders
    torusUniforms.uTime.value = time;
    torusUniforms.uDeltaTime.value = delta;
    
    if (ENABLE_NEURAL_SPHERE) {
      neuralSphereUniforms.uTime.value = time;
      neuralSphereUniforms.uDeltaTime.value = delta;
    }

    if (ti.progress < 1) {
      if (ti.startTime === -1) { // First frame of a new transition
        ti.startTime = time;
      }

      const elapsedTime = Math.max(0, time - ti.startTime);
      const progress = Math.min(1, elapsedTime / TRANSITION_DURATION);
      ti.progress = progress;

      const source = ti.sourceVisuals;
      const target = ti.targetVisuals;
      const cv = currentVisualsRef.current; // Current Visuals to update      // Update JavaScript transition values
      cv.particleOpacity = THREE.MathUtils.lerp(source.particleOpacity, target.particleOpacity, progress);
      cv.portalSpeedFactor = THREE.MathUtils.lerp(source.portalSpeedFactor, target.portalSpeedFactor, progress);
      cv.pulseSpeedFactor = THREE.MathUtils.lerp(source.pulseSpeedFactor, target.pulseSpeedFactor, progress);
      cv.pulseRateFactor = THREE.MathUtils.lerp(source.pulseRateFactor, target.pulseRateFactor, progress);
      cv.pulseColor.lerpColors(source.pulseColor, target.pulseColor, progress);
      cv.portalColorNear.lerpColors(source.portalColorNear, target.portalColorNear, progress);
      cv.portalColorFar.lerpColors(source.portalColorFar, target.portalColorFar, progress);
      cv.neuralSphereColor.lerpColors(source.neuralSphereColor, target.neuralSphereColor, progress);
      cv.neuralSphereOpacity = THREE.MathUtils.lerp(source.neuralSphereOpacity, target.neuralSphereOpacity, progress);
      cv.neuralSpherePulseAmount = THREE.MathUtils.lerp(source.neuralSpherePulseAmount, target.neuralSpherePulseAmount, progress);
      
      // Add new state properties
      cv.neuralSphereScale = THREE.MathUtils.lerp(source.neuralSphereScale || 1.0, target.neuralSphereScale || 1.0, progress);
      cv.pulsesFromCenter = progress > 0.5 ? target.pulsesFromCenter : source.pulsesFromCenter; // Switch halfway through transition
      cv.frozenAnimation = progress > 0.5 ? target.frozenAnimation : source.frozenAnimation; // Switch halfway through transition

      // Update shader uniforms directly during transition
      torusUniforms.uParticleOpacity.value = cv.particleOpacity;
      torusUniforms.uPortalSpeedFactor.value = cv.portalSpeedFactor;
      torusUniforms.uBreatheSpeed.value = BASE_BREATHE_SPEED * cv.portalSpeedFactor;
      // torusUniforms.uDriftSpeed.value = Z_DRIFT_SPEED * cv.portalSpeedFactor; // No longer needed
      torusUniforms.uRadialWaveSpeed.value = RADIAL_WAVE_SPEED * cv.portalSpeedFactor;
      torusUniforms.uZWaveSpeed.value = Z_WAVE_SPEED * cv.portalSpeedFactor;
      torusUniforms.uPulseColor.value.copy(cv.pulseColor);
      torusUniforms.uPortalColorNear.value.copy(cv.portalColorNear);
      torusUniforms.uPortalColorFar.value.copy(cv.portalColorFar);

      if (ENABLE_NEURAL_SPHERE) {
        neuralSphereUniforms.uNeuralSphereColor.value.copy(cv.neuralSphereColor);
        neuralSphereUniforms.uNeuralSphereOpacity.value = cv.neuralSphereOpacity;
        neuralSphereUniforms.uNeuralSpherePulseAmount.value = cv.neuralSpherePulseAmount;
      }      if (progress === 1) { // Transition finished, snap to target to ensure precision
        cv.particleOpacity = target.particleOpacity;
        cv.portalSpeedFactor = target.portalSpeedFactor;
        cv.pulseSpeedFactor = target.pulseSpeedFactor;
        cv.pulseRateFactor = target.pulseRateFactor;
        cv.pulseColor.copy(target.pulseColor);
        cv.portalColorNear.copy(target.portalColorNear);
        cv.portalColorFar.copy(target.portalColorFar);
        cv.neuralSphereColor.copy(target.neuralSphereColor);
        cv.neuralSphereOpacity = target.neuralSphereOpacity;
        cv.neuralSpherePulseAmount = target.neuralSpherePulseAmount;
        
        // Set new state properties
        cv.neuralSphereScale = target.neuralSphereScale || 1.0;
        cv.pulsesFromCenter = target.pulsesFromCenter || false;
        cv.frozenAnimation = target.frozenAnimation || false;
      }
    }
    
    // Use currentVisualsRef.current for all rendering logic
    const cv = currentVisualsRef.current; // Cache current visuals
    const {
      pulseSpeedFactor,
      pulseRateFactor,
    } = cv;
    
    const effectivePulseSpeed = PULSE_SPEED * pulseSpeedFactor;
    const effectivePulseRateFactor = pulseRateFactor;
      // Pulse Generation (from neural network logic)
    if (time - lastPulseGenerationTimeRef.current > nextPulseIntervalRef.current / effectivePulseRateFactor && activePulses.length < MAX_ACTIVE_PULSES) {
      if (nodeIndices.length > 0) {
        let origin;
        
        // Check if pulses should originate from center (for output or criticalError states)
        if (currentVisualsRef.current.pulsesFromCenter) {
          // For output or critical error state: pulses originate from center
          origin = new THREE.Vector3(0, 0, 0);
        } else {
          // Default: pulses originate from random nodes
          const randomNodeParticleIndex = nodeIndices[Math.floor(Math.random() * nodeIndices.length)];
          // Get the data from the individual attributes to find the pulse origin
          const particlePositions = pointsRef.current.geometry.attributes.particlePosition.array;
          const nodeBaseIndex = randomNodeParticleIndex * 3;
          
          origin = new THREE.Vector3(
            particlePositions[nodeBaseIndex], // x
            particlePositions[nodeBaseIndex + 1], // y
            particlePositions[nodeBaseIndex + 2]  // z
          );
        }
        
        setActivePulses(prev => [...prev, { origin, startTime: time, id: Math.random() }]);
        lastPulseGenerationTimeRef.current = time;
        nextPulseIntervalRef.current = (PULSE_GENERATION_INTERVAL_MIN + Math.random() * (PULSE_GENERATION_INTERVAL_MAX - PULSE_GENERATION_INTERVAL_MIN));
      }
    }
    
    // Update and filter active pulses
    const updatedActivePulses = activePulses.filter(pulse => {
      const travelRadius = (time - pulse.startTime) * effectivePulseSpeed;
      return travelRadius <= PULSE_MAX_TRAVEL_RADIUS;
    });
    if (updatedActivePulses.length !== activePulses.length) {
      setActivePulses(updatedActivePulses);
    }
    
    // Process neural pulses
    if (pointsRef.current.geometry) {
      const geom = pointsRef.current.geometry;
      const isNodeArray = geom.attributes.particleIsNode.array;
      const pulseIntensityArray = geom.attributes.particlePulseIntensity.array;
      const driftZArray = geom.attributes.particleDriftZ.array;
      
      // Attributes needed for dynamic position calculation
      const angles = geom.attributes.particleAngle.array;
      const radii = geom.attributes.particleRadius.array;
      const phases = geom.attributes.particlePhase.array;
      const zOffsets = geom.attributes.particleZOffset.array;

      const particlePosVecInstance = new THREE.Vector3(); // Reused for performance

      // Update drifting Z value for all particles
      // This should depend on portalSpeedFactor, not frozenAnimation, to match shader
      if (cv.portalSpeedFactor > 0.0) { // Check if there's any speed
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          driftZArray[i] -= Z_DRIFT_SPEED * cv.portalSpeedFactor * delta;
          // Wrap around when reaching the back of the portal
          if (driftZArray[i] < -PORTAL_DEPTH / 2.0) {
            driftZArray[i] += PORTAL_DEPTH;
          }
        }
        // Mark the driftZ attribute as needing an update (for the shader)
        geom.attributes.particleDriftZ.needsUpdate = true;
      }

      // Effective speeds for dynamic calculation on CPU
      const effectiveBreatheSpeed = BASE_BREATHE_SPEED * cv.portalSpeedFactor;
      const effectiveRadialWaveSpeed = RADIAL_WAVE_SPEED * cv.portalSpeedFactor;
      const effectiveZWaveSpeed = Z_WAVE_SPEED * cv.portalSpeedFactor;

      // Process each particle to calculate pulse effects
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        
        const isNode = isNodeArray[i] === 1;
        
        // Skip nodes - they don't need pulse intensity calculated this way
        if (isNode) {
          pulseIntensityArray[i] = 0.0; // Nodes themselves don't show pulse intensity from these pulses
          continue;
        }
        
        // Calculate current particle position (mirroring vertex shader)
        const particleAngle = angles[i];
        const particleRadius = radii[i];
        const particlePhase = phases[i];
        const particleZOffset = zOffsets[i];
        const currentDriftingZ = driftZArray[i];

        let particleCurrentX, particleCurrentY, particleCurrentZ;

        // Breathe factor
        let breatheFactor = 0.0;
        if (effectiveBreatheSpeed > 0.0001) { // Add a small threshold to avoid NaNs or tiny calculations if speed is effectively zero
          breatheFactor = Math.sin(time * effectiveBreatheSpeed + particlePhase);
        }

        // Radial wave
        const radialWaveOffset = time * effectiveRadialWaveSpeed;
        const angleWaveComponent = Math.sin(particleAngle * RADIAL_WAVE_FREQUENCY + radialWaveOffset);
        const dynamicRadius = particleRadius + angleWaveComponent * RADIAL_WAVE_AMPLITUDE;
        const pulsedRadius = dynamicRadius + breatheFactor * RADIAL_PULSE_AMPLITUDE;
        
        const x_base = Math.cos(particleAngle) * pulsedRadius;
        const y_base = Math.sin(particleAngle) * pulsedRadius;

        particleCurrentX = x_base * SNAKE_EYE_SCALE_X;
        particleCurrentY = y_base * SNAKE_EYE_SCALE_Y;

        // Z-wave
        const zWaveOffset = time * effectiveZWaveSpeed;
        const zAngleWaveComponent = Math.sin(particleAngle * Z_WAVE_FREQUENCY + zWaveOffset + particlePhase * 0.5);
        const waveZ = zAngleWaveComponent * Z_WAVE_AMPLITUDE;
        particleCurrentZ = currentDriftingZ + particleZOffset + breatheFactor * AXIAL_PULSE_AMPLITUDE + waveZ;
        
        particlePosVecInstance.set(particleCurrentX, particleCurrentY, particleCurrentZ);
        
        // Calculate pulse intensity based on this current dynamic position
        let maxPulseIntensity = 0;
        for (const pulse of updatedActivePulses) {
          const distToOrigin = particlePosVecInstance.distanceTo(pulse.origin);
          const pulseTravelRadius = (time - pulse.startTime) * effectivePulseSpeed;
          const diff = Math.abs(distToOrigin - pulseTravelRadius);
          
          if (diff < PULSE_WIDTH / 2) {
            const hitIntensity = (1.0 - diff / (PULSE_WIDTH / 2)) * 
                                 Math.max(0, 1.0 - pulseTravelRadius / PULSE_MAX_TRAVEL_RADIUS);
            maxPulseIntensity = Math.max(maxPulseIntensity, hitIntensity);
          }
        }
        
        // Store the pulse intensity for the shader to use
        pulseIntensityArray[i] = maxPulseIntensity;
      }
      // Notify Three.js that the data has changed
      geom.attributes.particlePulseIntensity.needsUpdate = true;
    }
    // Neural Sphere rotation update
    if (ENABLE_NEURAL_SPHERE) {
      const { frozenAnimation } = currentVisualsRef.current;
      
      // Only update rotation if not in frozen state
      if (!frozenAnimation) {
        setNeuralSphereRotation(time * NEURAL_SPHERE_ROTATION_SPEED);
      }
    }
  });
  // Update shader uniforms in useFrame
  useEffect(() => {
    // Update shader uniforms when aiState changes
    if (currentVisualsRef.current) {
      const {
        portalSpeedFactor,
        particleOpacity,
        pulseColor,
        portalColorNear,
        portalColorFar,
        neuralSphereColor,
        neuralSphereOpacity,
        neuralSpherePulseAmount,
        frozenAnimation
      } = currentVisualsRef.current;

      // Update torus uniforms
      torusUniforms.uPortalSpeedFactor.value = portalSpeedFactor;
      torusUniforms.uBreatheSpeed.value = BASE_BREATHE_SPEED * portalSpeedFactor;
      // torusUniforms.uDriftSpeed.value = Z_DRIFT_SPEED * portalSpeedFactor; // No longer needed
      torusUniforms.uRadialWaveSpeed.value = RADIAL_WAVE_SPEED * portalSpeedFactor;
      torusUniforms.uZWaveSpeed.value = Z_WAVE_SPEED * portalSpeedFactor;
      torusUniforms.uParticleOpacity.value = particleOpacity;
      torusUniforms.uPulseColor.value.copy(pulseColor);
      torusUniforms.uPortalColorNear.value.copy(portalColorNear);
      torusUniforms.uPortalColorFar.value.copy(portalColorFar);

      // Update neural sphere uniforms
      neuralSphereUniforms.uNeuralSpherePulseAmount.value = neuralSpherePulseAmount;
      neuralSphereUniforms.uNeuralSphereColor.value.copy(neuralSphereColor);
      neuralSphereUniforms.uNeuralSphereOpacity.value = neuralSphereOpacity;
      
      // For frozen animation in critical error state, we can reduce the shimmer speed to almost zero
      if (frozenAnimation) {
        neuralSphereUniforms.uNeuralSphereShimmerSpeed.value = 0.05; // Very slow shimmer for frozen look
        neuralSphereUniforms.uNeuralSpherePulseSpeed.value = 0.1; // Very slow pulse for frozen look
      } else {
        neuralSphereUniforms.uNeuralSphereShimmerSpeed.value = NEURAL_SPHERE_SHIMMER_SPEED;
        neuralSphereUniforms.uNeuralSpherePulseSpeed.value = NEURAL_SPHERE_PULSE_SPEED;
      }
    }
  }, [aiState, torusUniforms, neuralSphereUniforms]);
  return (
    <> {/* Use a fragment to return multiple sibling components */}
      {/* Add ambient light to increase overall scene brightness */}
      <ambientLight intensity={0.4} />
      
      {/* Add point light at center for dynamic illumination */}
      <pointLight position={[0, 0, 0]} intensity={0.8} distance={2} color="#ffffff" />
      
      <points {...props} ref={pointsRef} geometry={particles}>
        <shaderMaterial
          vertexShader={torusVertexShader}
          fragmentShader={torusFragmentShader}
          uniforms={torusUniforms}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexColors={true}
        />
      </points>      {ENABLE_NEURAL_SPHERE && neuralSphereParticleGeometry && (        <group 
          scale={[
            currentVisualsRef.current.neuralSphereScale, 
            currentVisualsRef.current.neuralSphereScale, 
            currentVisualsRef.current.neuralSphereScale
          ]}
          rotation={[
            0, 
            currentVisualsRef.current.frozenAnimation ? 0 : neuralSphereRotation, 
            0
          ]}
        >
          <points ref={neuralSpherePointsRef} geometry={neuralSphereParticleGeometry}>
            <shaderMaterial
              vertexShader={neuralSphereVertexShader}
              fragmentShader={neuralSphereFragmentShader}
              uniforms={neuralSphereUniforms}
              transparent={true}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              vertexColors={true}
            />
          </points>
        </group>
      )}
    </>
  );
}

export default Orb;
