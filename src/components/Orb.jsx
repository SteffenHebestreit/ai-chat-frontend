import React, { useRef, useMemo, useState, useEffect } from 'react'; // Added useState, useEffect
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Configuration from Portal/Torus
const PARTICLE_COUNT = 5000;
const OUTER_RADIUS = 1.05;
const INNER_RADIUS = 0.95;
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
const COLOR_NEAR = new THREE.Color('#00ffff');
const COLOR_FAR = new THREE.Color('#4a00e0');
const BASE_BREATHE_SPEED = 0.5;
const BASE_PARTICLE_OPACITY = 0.8; // Default opacity

// Constants for the Neural Pulse effect (previously missing)
const NUM_NODES = 10; // Number of 'neural nodes' on the torus
const NODE_COLOR = new THREE.Color(0xffaa00); // Color of the 'neural nodes'
const PULSE_COLOR = new THREE.Color(0xffffff); // Color of the pulses
const PULSE_SPEED = 2.5; // How fast pulses travel
const PULSE_WIDTH = 0.83; // Width of the pulse wave
const PULSE_MAX_TRAVEL_RADIUS = OUTER_RADIUS * 4.5; // Max distance a pulse travels
const MAX_ACTIVE_PULSES = 9; // Max number of concurrent pulses
const PULSE_GENERATION_INTERVAL_MIN = 0.5; // Minimum seconds between new pulses
const PULSE_GENERATION_INTERVAL_MAX = 2.0; // Maximum seconds between new pulses


// Neural Sphere Configuration
const ENABLE_NEURAL_SPHERE = true; // Master toggle for the neural sphere
const NEURAL_SPHERE_RADIUS = 0.25; // Radius of the central neural sphere
const NEURAL_SPHERE_PARTICLE_COUNT = 200; // Number of particles in the neural sphere
const NEURAL_SPHERE_BASE_COLOR = new THREE.Color(0x8888ff); // Light blue/purple
const NEURAL_SPHERE_ACTIVITY_COLOR = new THREE.Color(0xffffff); // Bright white for activity
const NEURAL_SPHERE_ERROR_COLOR = new THREE.Color(0xff3333); // Muted red for error
const NEURAL_SPHERE_BASE_OPACITY = 0.7;
const NEURAL_SPHERE_ACTIVITY_OPACITY = 0.9;
const NEURAL_SPHERE_ERROR_OPACITY = 0.5;
const NEURAL_SPHERE_BASE_PULSE_AMOUNT = 0.05; // How much it scales up
const NEURAL_SPHERE_ACTIVITY_PULSE_AMOUNT = 0.15;
const NEURAL_SPHERE_ERROR_PULSE_AMOUNT = 0.02;
const NEURAL_SPHERE_PULSE_SPEED = 1.0; // Speed of the global pulse
const NEURAL_SPHERE_SHIMMER_SPEED = 1.5; // Speed of individual particle shimmer
const NEURAL_SPHERE_SHIMMER_INTENSITY = 0.3; // Max brightness change for shimmer

// --- BEGIN REFINEMENT CONSTANTS ---
const NEURAL_SPHERE_ROTATION_SPEED = 0.41; // Radians per second for Y-axis rotation
const NEURAL_SPHERE_PARTICLE_SIZE = 0.02; // Size of neural sphere particles
const NEURAL_SPHERE_SHIMMER_COLOR_FACTOR = 0.3; // How much shimmer shifts color towards white (0-1)
const NEURAL_SPHERE_POP_THRESHOLD = 0.85; // Shimmer value (0-1) to trigger "pop" effect
const NEURAL_SPHERE_POP_COLOR_LERP_FACTOR = 0.7; // How much "pop" shifts color to activity color (0-1)
const NEURAL_SPHERE_POP_OPACITY_BOOST = 0.3; // Value added to base particle opacity during pop (capped at 1.0)
// --- END REFINEMENT CONSTANTS ---

// --- END NEURAL SPHERE CONFIGURATION ---

const TRANSITION_DURATION = 1.1; // Seconds for state transitions (Increased from 0.75)

// AI State Modifiers
const AI_STATE_MODIFIERS = {
  default:    { 
    portalSpeedFactor: 1.0, pulseSpeedFactor: 0.7, pulseRateFactor: 0.5, 
    particleOpacity: BASE_PARTICLE_OPACITY, 
    pulseColorOverride: null, portalColorNearOverride: null, portalColorFarOverride: null,
    neuralSphereColor: NEURAL_SPHERE_BASE_COLOR, neuralSphereOpacity: NEURAL_SPHERE_BASE_OPACITY, neuralSpherePulseAmount: NEURAL_SPHERE_BASE_PULSE_AMOUNT
  },
  activity:   { 
    portalSpeedFactor: 1.2, 
    pulseSpeedFactor: 1.2, 
    pulseRateFactor: 1.5, 
    particleOpacity: BASE_PARTICLE_OPACITY + 0.15, // Slightly more opacity for glow
    pulseColorOverride: new THREE.Color(0xffffff), // Bright white pulses (sparks)
    portalColorNearOverride: new THREE.Color(0xffff33), // Bright yellow
    portalColorFarOverride: new THREE.Color(0xffaa00),   // Deeper orange-yellow
    neuralSphereColor: NEURAL_SPHERE_ACTIVITY_COLOR, neuralSphereOpacity: NEURAL_SPHERE_ACTIVITY_OPACITY, neuralSpherePulseAmount: NEURAL_SPHERE_ACTIVITY_PULSE_AMOUNT
  },
  error:      { 
    portalSpeedFactor: 0.3, pulseSpeedFactor: 0.2, pulseRateFactor: 0.1, 
    particleOpacity: BASE_PARTICLE_OPACITY - 0.3, 
    pulseColorOverride: new THREE.Color(0xff0000), 
    portalColorNearOverride: new THREE.Color(0x8B0000), 
    portalColorFarOverride: new THREE.Color(0x3d0000),
    neuralSphereColor: NEURAL_SPHERE_ERROR_COLOR, neuralSphereOpacity: NEURAL_SPHERE_ERROR_OPACITY, neuralSpherePulseAmount: NEURAL_SPHERE_ERROR_PULSE_AMOUNT
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
  };
};

function Orb({ aiState = 'default', ...props }) { 
  const pointsRef = useRef();
  const neuralSpherePointsRef = useRef(); // Ref for the neural sphere
  const [activePulses, setActivePulses] = useState([]);
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
    const data = new Float32Array(PARTICLE_COUNT * 10); // 10 elements per particle

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const i10 = i * 10;

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

      data[i10 + 0] = initialAngle;
      data[i10 + 1] = initialRadius;
      data[i10 + 2] = Math.random() * Math.PI * 2; // randomPhaseForBreath
      data[i10 + 3] = initialDriftingZ;
      data[i10 + 4] = staticZOffsetForPulse;
      data[i10 + 5] = isNode ? 1 : 0;
      data[i10 + 6] = 0; // currentPulseIntensity
      data[i10 + 7] = initialBaseX;
      data[i10 + 8] = initialBaseY;
      data[i10 + 9] = initialBaseZ;

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
    particleGeometry.setAttribute('particlesData', new THREE.BufferAttribute(data, 10));
    return { particles: particleGeometry }; // Removed particlesData from return, access via geometry
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
  }, []);
  // --- END NEURAL SPHERE GEOMETRY ---

  useFrame((state, delta) => {
    if (!pointsRef.current || !pointsRef.current.geometry.attributes.position || !pointsRef.current.geometry.attributes.color || !pointsRef.current.geometry.attributes.particlesData || !pointsRef.current.material) return;
    if (ENABLE_NEURAL_SPHERE && (!neuralSpherePointsRef.current || !neuralSpherePointsRef.current.geometry || !neuralSpherePointsRef.current.material || !neuralSphereParticleGeometry)) return;


    const time = state.clock.getElapsedTime();
    const ti = transitionInfoRef.current; // Transition Info

    // Define these at the start of useFrame
    const positionsArray = pointsRef.current.geometry.attributes.position.array;
    const colorsArray = pointsRef.current.geometry.attributes.color.array;
    const particleDataArray = pointsRef.current.geometry.attributes.particlesData.array;
    const tempColorInstance = new THREE.Color();
    const particlePosVecInstance = new THREE.Vector3();

    if (ti.progress < 1) {
      if (ti.startTime === -1) { // First frame of a new transition
        ti.startTime = time;
      }

      const elapsedTime = Math.max(0, time - ti.startTime);
      const progress = Math.min(1, elapsedTime / TRANSITION_DURATION);
      ti.progress = progress;

      const source = ti.sourceVisuals;
      const target = ti.targetVisuals;
      const cv = currentVisualsRef.current; // Current Visuals to update

      cv.particleOpacity = THREE.MathUtils.lerp(source.particleOpacity, target.particleOpacity, progress);
      cv.portalSpeedFactor = THREE.MathUtils.lerp(source.portalSpeedFactor, target.portalSpeedFactor, progress);
      cv.pulseSpeedFactor = THREE.MathUtils.lerp(source.pulseSpeedFactor, target.pulseSpeedFactor, progress);
      cv.pulseRateFactor = THREE.MathUtils.lerp(source.pulseRateFactor, target.pulseRateFactor, progress);

      cv.pulseColor.lerpColors(source.pulseColor, target.pulseColor, progress);
      cv.portalColorNear.lerpColors(source.portalColorNear, target.portalColorNear, progress);
      cv.portalColorFar.lerpColors(source.portalColorFar, target.portalColorFar, progress);

      // Lerp Neural Sphere properties
      cv.neuralSphereColor.lerpColors(source.neuralSphereColor, target.neuralSphereColor, progress);
      cv.neuralSphereOpacity = THREE.MathUtils.lerp(source.neuralSphereOpacity, target.neuralSphereOpacity, progress);
      cv.neuralSpherePulseAmount = THREE.MathUtils.lerp(source.neuralSpherePulseAmount, target.neuralSpherePulseAmount, progress);


      if (progress === 1) { // Transition finished, snap to target to ensure precision
        cv.particleOpacity = target.particleOpacity;
        cv.portalSpeedFactor = target.portalSpeedFactor;
        cv.pulseSpeedFactor = target.pulseSpeedFactor;
        cv.pulseRateFactor = target.pulseRateFactor;
        cv.pulseColor.copy(target.pulseColor);
        cv.portalColorNear.copy(target.portalColorNear);
        cv.portalColorFar.copy(target.portalColorFar);
        // Snap Neural Sphere properties
        cv.neuralSphereColor.copy(target.neuralSphereColor);
        cv.neuralSphereOpacity = target.neuralSphereOpacity;
        cv.neuralSpherePulseAmount = target.neuralSpherePulseAmount;
      }
    }
    
    // Use currentVisualsRef.current for all rendering logic
    const {
      particleOpacity,
      portalSpeedFactor,
      pulseSpeedFactor,
      pulseRateFactor,
      pulseColor,
      portalColorNear,
      portalColorFar,
      // Destructure neural sphere properties
      neuralSphereColor,
      neuralSphereOpacity,
      neuralSpherePulseAmount
    } = currentVisualsRef.current;

    pointsRef.current.material.opacity = particleOpacity;
    
    const effectivePulseSpeed = PULSE_SPEED * pulseSpeedFactor;
    const effectivePulseRateFactor = pulseRateFactor;
    
    // currentPulseColor, currentPortalColorNear, currentPortalColorFar are now directly from currentVisualsRef
    const currentBreatheSpeed = BASE_BREATHE_SPEED * portalSpeedFactor;
    const currentDriftSpeed = Z_DRIFT_SPEED * portalSpeedFactor;
    const currentRadialWaveSpeed = RADIAL_WAVE_SPEED * portalSpeedFactor;
    const currentZWaveSpeed = Z_WAVE_SPEED * portalSpeedFactor;

    // Pulse Generation (from neural network logic)
    if (time - lastPulseGenerationTimeRef.current > nextPulseIntervalRef.current / effectivePulseRateFactor && activePulses.length < MAX_ACTIVE_PULSES) {
      if (nodeIndices.length > 0) {
        const randomNodeParticleIndex = nodeIndices[Math.floor(Math.random() * nodeIndices.length)];
        const nodeDataStartIndex = randomNodeParticleIndex * 10; // Each particle has 10 data elements
        // Use the initial base position of the node as the pulse origin
        // This means pulses originate from the torus structure, before drift/wave displacement of the node itself
        const origin = new THREE.Vector3(
          particleDataArray[nodeDataStartIndex + 7], // initialBaseX - USE CORRECT ARRAY
          particleDataArray[nodeDataStartIndex + 8], // initialBaseY - USE CORRECT ARRAY
          particleDataArray[nodeDataStartIndex + 9]  // initialBaseZ - USE CORRECT ARRAY
        );
        setActivePulses(prev => [...prev, { origin, startTime: time, id: Math.random() }]);
        lastPulseGenerationTimeRef.current = time;
        nextPulseIntervalRef.current = (PULSE_GENERATION_INTERVAL_MIN + Math.random() * (PULSE_GENERATION_INTERVAL_MAX - PULSE_GENERATION_INTERVAL_MIN));
      }
    }
    
    // Update and filter active pulses (from neural network logic)
    const updatedActivePulses = activePulses.filter(pulse => {
      const travelRadius = (time - pulse.startTime) * effectivePulseSpeed;
      return travelRadius <= PULSE_MAX_TRAVEL_RADIUS;
    });
    if (updatedActivePulses.length !== activePulses.length) {
      setActivePulses(updatedActivePulses);
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const i10 = i * 10;

      const initialAngle = particleDataArray[i10 + 0];
      const initialRadius = particleDataArray[i10 + 1];
      const randomPhase = particleDataArray[i10 + 2];
      let currentDriftingZ = particleDataArray[i10 + 3];
      const staticZOffsetForPulse = particleDataArray[i10 + 4];
      const isNode = particleDataArray[i10 + 5] === 1;
      // currentPulseIntensity (particleDataArray[i10 + 6]) will be calculated below


      // Portal: Update Drifting Z
      if (portalSpeedFactor > 0) {
        currentDriftingZ -= currentDriftSpeed * delta;
        while (currentDriftingZ < -PORTAL_DEPTH / 2) {
          currentDriftingZ += PORTAL_DEPTH;
        }
        particleDataArray[i10 + 3] = currentDriftingZ;
      }

      // Portal: Breathing factor
      let breatheFactor = 0;
      if (currentBreatheSpeed > 0) {
        breatheFactor = Math.sin(time * currentBreatheSpeed + randomPhase);
      }

      // Portal: New Wave Morphing
      const radialWaveOffset = time * currentRadialWaveSpeed; // Use portalSpeedFactor adjusted speed
      const angleWaveComponent = Math.sin(initialAngle * RADIAL_WAVE_FREQUENCY + radialWaveOffset);
      const dynamicRadius = initialRadius + angleWaveComponent * RADIAL_WAVE_AMPLITUDE;
      const pulsedRadius = dynamicRadius + breatheFactor * RADIAL_PULSE_AMPLITUDE;

      let x_base = Math.cos(initialAngle) * pulsedRadius;
      let y_base = Math.sin(initialAngle) * pulsedRadius;

      // Portal: Apply snake-eye scaling
      let finalX = x_base * SNAKE_EYE_SCALE_X;
      let finalY = y_base * SNAKE_EYE_SCALE_Y;

      // Portal: Final Z
      const zWaveOffset = time * currentZWaveSpeed; // Use portalSpeedFactor adjusted speed
      const zAngleWaveComponent = Math.sin(initialAngle * Z_WAVE_FREQUENCY + zWaveOffset + randomPhase * 0.5);
      const waveZ = zAngleWaveComponent * Z_WAVE_AMPLITUDE;
      let finalZ = currentDriftingZ + staticZOffsetForPulse + breatheFactor * AXIAL_PULSE_AMPLITUDE + waveZ;
      
      // Store current calculated position for pulse distance check if not a node
      // For nodes, their visual position is also determined by portal effects for now
      positionsArray[i3] = finalX;
      positionsArray[i3 + 1] = finalY;
      positionsArray[i3 + 2] = finalZ;
      particlePosVecInstance.set(finalX, finalY, finalZ); // Current visual position - USE CORRECT INSTANCE

      // Neural: Calculate Pulse Intensity for non-node particles
      let maxPulseIntensity = 0;
      if (!isNode) {
        for (const pulse of updatedActivePulses) {
          // Distance check against the particle\'s current *visual* position and pulse origin (which is static initial node pos)
          const distToOrigin = particlePosVecInstance.distanceTo(pulse.origin); // USE CORRECT INSTANCE
          const pulseTravelRadius = (time - pulse.startTime) * effectivePulseSpeed;
          const diff = Math.abs(distToOrigin - pulseTravelRadius);

          if (diff < PULSE_WIDTH / 2) {
            const hitIntensity = (1.0 - diff / (PULSE_WIDTH / 2)) * Math.max(0, 1.0 - pulseTravelRadius / PULSE_MAX_TRAVEL_RADIUS);
            maxPulseIntensity = Math.max(maxPulseIntensity, hitIntensity);
          }
        }
      }
      particleDataArray[i10 + 6] = maxPulseIntensity; // Store currentPulseIntensity

      // Color Calculation: Combine Portal Z-depth color with Neural Pulse color
      if (isNode) {
        tempColorInstance.copy(NODE_COLOR); // USE CORRECT INSTANCE
      } else {
        // Portal: Z-depth color
        const colorCycleLength = PORTAL_DEPTH;
        const colorCycleOffset = -PORTAL_DEPTH / 2; 
        let normalizedZPeriodic = (finalZ - colorCycleOffset) / colorCycleLength;
        normalizedZPeriodic = normalizedZPeriodic - Math.floor(normalizedZPeriodic); 
        tempColorInstance.copy(portalColorFar).lerp(portalColorNear, normalizedZPeriodic); // Use interpolated portal colors - USE CORRECT INSTANCE

        // Neural: Lerp towards PULSE_COLOR based on intensity
        tempColorInstance.lerp(pulseColor, maxPulseIntensity); // Use interpolated pulse color - USE CORRECT INSTANCE
      }
      
      colorsArray[i3] = tempColorInstance.r; // USE CORRECT ARRAY & INSTANCE
      colorsArray[i3 + 1] = tempColorInstance.g; // USE CORRECT ARRAY & INSTANCE
      colorsArray[i3 + 2] = tempColorInstance.b; // USE CORRECT ARRAY & INSTANCE
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    pointsRef.current.geometry.attributes.particlesData.needsUpdate = true;

    // --- BEGIN NEURAL SPHERE ANIMATION ---
    if (ENABLE_NEURAL_SPHERE && neuralSpherePointsRef.current && neuralSphereParticleGeometry) {
      // Rotation
      neuralSpherePointsRef.current.rotation.y += delta * NEURAL_SPHERE_ROTATION_SPEED;

      const nsColors = neuralSphereParticleGeometry.attributes.color.array; // RGBA
      const nsShimmerData = neuralSphereParticleGeometry.attributes.shimmerData.array;
      // const nsMaterial = neuralSpherePointsRef.current.material; // Material properties like global opacity are not set here anymore
      
      const tempNsColorInstance = new THREE.Color(); // Reusable THREE.Color instance for calculations

      // Global pulse for the neural sphere (scaling the points object)
      const pulseScale = 1 + Math.sin(time * NEURAL_SPHERE_PULSE_SPEED) * neuralSpherePulseAmount;
      neuralSpherePointsRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      
      const baseParticleOpacityForCurrentState = neuralSphereOpacity; // Opacity from currentVisualsRef (handles transitions)

      for (let i = 0; i < NEURAL_SPHERE_PARTICLE_COUNT; i++) {
        const i4 = i * 4; // Index for RGBA components
        const shimmerPhase = nsShimmerData[i];
        const shimmerValue = (Math.sin(time * NEURAL_SPHERE_SHIMMER_SPEED + shimmerPhase) + 1) / 2; // Normalized 0 to 1

        // Start with the sphere's current base color (state-dependent)
        tempNsColorInstance.copy(neuralSphereColor); 
        let finalParticleAlpha = baseParticleOpacityForCurrentState;

        // 1. Base Shimmer Brightness (modulates the current neuralSphereColor)
        const baseBrightnessFactor = 1.0 - NEURAL_SPHERE_SHIMMER_INTENSITY + shimmerValue * NEURAL_SPHERE_SHIMMER_INTENSITY;
        tempNsColorInstance.multiplyScalar(baseBrightnessFactor);

        // 2. General Shimmer Color Shift (subtly towards white)
        // Clone before lerping to white, so pop effect can lerp from this shimmered color
        let shimmerAdjustedColor = tempNsColorInstance.clone();
        const generalColorShiftAmount = shimmerValue * NEURAL_SPHERE_SHIMMER_COLOR_FACTOR;
        shimmerAdjustedColor.lerp(new THREE.Color(0xffffff), generalColorShiftAmount);

        // 3. "Pop" Effect calculation
        let popIntensity = 0;
        if (shimmerValue > NEURAL_SPHERE_POP_THRESHOLD) {
            popIntensity = (shimmerValue - NEURAL_SPHERE_POP_THRESHOLD) / (1.0 - NEURAL_SPHERE_POP_THRESHOLD);
        }

        if (popIntensity > 0) {
            // Pop Color Lerp: Lerp from the shimmerAdjustedColor towards NEURAL_SPHERE_ACTIVITY_COLOR
            shimmerAdjustedColor.lerp(NEURAL_SPHERE_ACTIVITY_COLOR, popIntensity * NEURAL_SPHERE_POP_COLOR_LERP_FACTOR);
            
            // Pop Opacity Boost: Add to base opacity, capped at 1.0
            finalParticleAlpha = Math.min(1.0, baseParticleOpacityForCurrentState + popIntensity * NEURAL_SPHERE_POP_OPACITY_BOOST);
        }

        // Assign final color and alpha to buffer
        nsColors[i4]     = shimmerAdjustedColor.r;
        nsColors[i4 + 1] = shimmerAdjustedColor.g;
        nsColors[i4 + 2] = shimmerAdjustedColor.b;
        nsColors[i4 + 3] = finalParticleAlpha;
      }
      neuralSphereParticleGeometry.attributes.color.needsUpdate = true;
    }
    // --- END NEURAL SPHERE ANIMATION ---

    pointsRef.current.rotation.x = 0;
    pointsRef.current.rotation.y = 0;
    pointsRef.current.rotation.z = 0; 
  });

  return (
    <> {/* Use a fragment to return multiple sibling components */}
      <points {...props} ref={pointsRef} geometry={particles}>
        <pointsMaterial 
          size={1.2} // From portal version
          sizeAttenuation={false} // From portal version
          transparent={true} 
          // opacity={0.8} // Opacity is now set dynamically in useFrame
          blending={THREE.AdditiveBlending} 
          vertexColors={true}
          depthWrite={false} // Often good for additive blending of transparent particles
        />
      </points>
      {ENABLE_NEURAL_SPHERE && neuralSphereParticleGeometry && (
        <points ref={neuralSpherePointsRef} geometry={neuralSphereParticleGeometry}>
          <pointsMaterial
            size={NEURAL_SPHERE_PARTICLE_SIZE} // Use new constant for particle size
            sizeAttenuation={true} // Enable size attenuation
            transparent={true}
            blending={THREE.AdditiveBlending}
            vertexColors={true} // Crucial for individual particle color AND alpha
            depthWrite={false}
            // Global opacity is now controlled via vertex alpha, derived from neuralSphereOpacity
          />
        </points>
      )}
    </>
  );
}

export default Orb;
