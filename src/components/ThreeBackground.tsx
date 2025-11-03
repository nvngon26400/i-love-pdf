import { Canvas } from '@react-three/fiber'
import { Stars, Float } from '@react-three/drei'

export default function ThreeBackground() {
  return (
    <div className="three-bg">
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
        <color attach="background" args={["#0f0f14"]} />
        <ambientLight intensity={0.6} />
        <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
          <mesh position={[0, 0, -2]}> 
            <torusKnotGeometry args={[1.2, 0.3, 128, 16]} />
            <meshStandardMaterial color="#6d58ff" metalness={0.6} roughness={0.2} />
          </mesh>
        </Float>
        <Stars radius={100} depth={50} count={4000} factor={4} saturation={0} fade />
      </Canvas>
    </div>
  )
}