import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import fragmentShader from "./fragment";
import vertexShader from "./vertex";
import { useControls } from "leva";
import {useStore} from '../../src/store'

function Scene() {
  const mesh = useRef();
  const { speed, colorA, colorB, intensity, particalSize } = useControls({
    colorA: "#1c4534",
    colorB: "#00ff23",
    speed: {
      value: 1.1,
      min: 0.1,
      max: 2.0,
      step: 0.05
    },
    intensity: {
      value: 0.2,
      min: 0.01,
      max: 0.3,
      step: 0.01
    },
    particalSize: {
      value: 24.0,
      min: 5.0,
      max: 100.0,
      step: 1.0
    }
  });

  const uniforms = useMemo(() => {
    return {
      u_time: {
        value: 0.0
      },
      u_speed: {
        value: speed
      },
      u_intensity: {
        value: intensity
      },
      u_partical_size: {
        value: particalSize
      },
      u_color_a: {
        value: new THREE.Color(colorA)
      },
      u_color_b: {
        value: new THREE.Color(colorB)
      }
    };
  }, []);
  useFrame((state) => {
    const status = useStore.getState().status
    const { clock } = state;
    mesh.current.material.uniforms.u_time.value = clock.getElapsedTime();
    mesh.current.material.uniforms.u_speed.value = speed;
    mesh.current.material.uniforms.u_intensity.value = status ? intensity : intensity*2;
    mesh.current.material.uniforms.u_partical_size.value = status ? particalSize: particalSize*2 ;
    mesh.current.material.uniforms.u_color_a.value = new THREE.Color(colorA);
    mesh.current.material.uniforms.u_color_b.value = new THREE.Color(colorB);
  });

  return (
    <>
      <color args={["#000000"]} attach="background" />
      <OrbitControls />
      <ambientLight />
      <points scale={1.5} ref={mesh}>
        <icosahedronGeometry args={[2, 20]} />
        <shaderMaterial
          uniforms={uniforms}
          fragmentShader={fragmentShader}
          vertexShader={vertexShader}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}

export default function Example() {
  return (
    <Canvas camera={{ position: [8, 0, 0] }}>
      <Scene />
    </Canvas>
  );
}
