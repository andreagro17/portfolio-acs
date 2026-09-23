import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, signal, OnInit, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface FloatingItemConfig {
  url: string;
  position: [number, number, number];
  scale: number;
  rotation?: [number, number, number];
  floatHeight?: number;
  speed?: number;
}

interface FloatingItem {
  config: FloatingItemConfig;
  group: THREE.Group;
  targetScale: number;
  progress: number;
}



@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About implements AfterViewInit {

  @ViewChild('avatarContainer', { static: true })
  avatarContainer!: ElementRef<HTMLDivElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private avatar?: THREE.Object3D;
  private avatarProgress = 0;

  private floatingItems: FloatingItem[] = [];

  private readonly itemConfigs: FloatingItemConfig[] = [
    {
      url: '/book2.glb',
      position: [1.2, 0.5, 0],
      scale: 0.5,
      rotation: [0, Math.PI / 1.9, Math.PI / 2.5],
      floatHeight: 0.3,
      speed: 0.0015,
    },
    {
      url: '/wheat.glb',
      position: [-1.2, 0.5, 0],
      scale: 0.5,
      floatHeight: 0.3,
      speed: 0.0015,
    },
    {
      url: '/sport.glb',
      position: [0, 0.5, 0.8],
      scale: 0.5,
      floatHeight: 0.3,
      speed: 0.0015,
    },
  ];


  constructor(@Inject(PLATFORM_ID) private platformId: object) { }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initThree();
    this.loadAvatar();
    this.loadItems();
    this.animate();
    console.log('Componente About view inicializado');
  }

  private initThree(): void {
    const container = this.avatarContainer.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f3f4f6');

    this.camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 1.4, 3)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(2, 3, 4);
    this.scene.add(directionalLight);
  }

  private loadAvatar(): void {
    const loader = new GLTFLoader();

    loader.load(
      '/avatar.glb',
      (gltf: GLTF) => {
        const avatar = gltf.scene;

        avatar.position.set(0, 0, 0);
        avatar.scale.setScalar(1.5);
        // Bounding box
        const box = new THREE.Box3().setFromObject(avatar);

        // Centro
        const center = box.getCenter(new THREE.Vector3());

        // Tamaño
        const size = box.getSize(new THREE.Vector3());

        // Centrar modelo
        avatar.position.sub(center);

        this.avatar = avatar;
        this.scene.add(avatar);

        // El modelo ya está centrado en el origen (0,0,0)
        const maxSize = Math.max(size.x, size.y, size.z);

        // Distancia de cámara según el tamaño del modelo
        const distance = maxSize * 2.2;

        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0);
      },
      undefined,
      (error: unknown) => {
        console.error('No se pudo cargar el avatar:', error);
      }
    );
  }

  private loadItems(): void {
    const loader = new GLTFLoader();

    for (const config of this.itemConfigs) {
      loader.load(
        config.url,
        (gltf: GLTF) => {
          const model = gltf.scene;

          // Centrar el modelo en su propio origen
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          model.position.sub(center);

          // Orientación estática opcional
          if (config.rotation) {
            model.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
          }

          // Normalizar el tamaño según la dimensión mayor
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = maxDim > 0 ? config.scale / maxDim : config.scale;

          // Envolver en un grupo para animar sin romper el centrado
          const group = new THREE.Group();
          group.add(model);
          group.position.set(config.position[0], config.position[1], config.position[2]);
          group.scale.setScalar(0.001);

          this.scene.add(group);
          this.floatingItems.push({ config, group, targetScale, progress: 0 });
        },
        undefined,
        (error: unknown) => {
          console.error(`No se pudo cargar ${config.url}:`, error);
        }
      );
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    for (const item of this.floatingItems) {
      if (item.progress < 1) {
        item.progress = Math.min(item.progress + (item.config.speed ?? 0.0015), 1);

        const progress = this.easeInOutCubic(item.progress);

        item.group.scale.setScalar(progress * item.targetScale);
        item.group.position.y = item.config.position[1] + progress * (item.config.floatHeight ?? 0.3);
        item.group.rotation.y = progress * Math.PI * 2;
      }
    }

    if (this.avatar && this.avatarProgress < 1) {
      this.avatarProgress = Math.min(this.avatarProgress + 0.005, 1);
      this.avatar.rotation.y = this.easeInOutCubic(this.avatarProgress) * Math.PI * 2;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  

  private easeInOutCubic(value: number): number {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }
}
