import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';

import * as THREE from 'three';

import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class Header implements AfterViewInit, OnDestroy {

  @ViewChild('headerContainer', { static: true })
  private readonly headerContainer!: ElementRef<HTMLElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;

  private animationFrameId?: number;
  private resizeObserver?: ResizeObserver;
  private readonly fish: THREE.Group[] = [];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return
    }
    this.initializeScene();
    this.createText();
    this.createFish();
    this.initializeResizeObserver();

    // El render loop corre fuera de Angular para no disparar change detection cada frame.
    this.ngZone.runOutsideAngular(() => this.animate());
  }
    ngOnDestroy(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.resizeObserver?.disconnect();

    this.scene?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      object.geometry.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material.dispose();
      }
    });

    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
  private initializeScene(): void {
    const container = this.headerContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x071b2b);

    this.camera = new THREE.PerspectiveCamera(
      45,
      width / Math.max(height, 1),
      0.1,
      100,
    );

    this.camera.position.set(0, 1, 7);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // El canvas lo crea Three sin atributos de Angular, así que lo posicionamos por estilo inline.
    const canvas = this.renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    container.appendChild(canvas);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);

    directionalLight.position.set(2, 4, 5);
    directionalLight.castShadow = true;

    this.scene.add(ambientLight, directionalLight);
  }
  private createText(): void {
    if (!this.scene) {
      return;
    }

    const fontLoader = new FontLoader();

    fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
      if (!this.scene) {
        return;
      }

      const geometry = new TextGeometry('Andrea', {
        font,
        size: 0.75,
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 3,
      });

      geometry.center();
      const material = new THREE.MeshStandardMaterial({
        color: 0x8be9fd,
        roughness: 0.3,
        metalness: 0.25,
      });

      const text = new THREE.Mesh(geometry, material);
      text.castShadow = true;

      this.scene.add(text);
    });
  }
  private createFish(): void {
    if (!this.scene) {
      return;
    }

    const palette = [
      { body: 0xff9f43, fin: 0xffd38a },
      { body: 0xff6b9d, fin: 0xffc2d6 },
      { body: 0x54d1ff, fin: 0xb5ecff },
      { body: 0x9d7bff, fin: 0xd8c9ff },
    ];

    for (let index = 0; index < palette.length; index += 1) {
      const colors = palette[index];
      const fish = new THREE.Group();

      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: colors.body,
        roughness: 0.3,
        metalness: 0.2,
        emissive: colors.body,
        emissiveIntensity: 0.12,
      });

      const finMaterial = new THREE.MeshStandardMaterial({
        color: colors.fin,
        roughness: 0.5,
        metalness: 0.05,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });

      // Cuerpo: esfera alargada y aplanada para dar silueta de pez.
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), bodyMaterial);
      body.scale.set(1.6, 0.85, 0.7);
      body.castShadow = true;

      // Aleta dorsal.
      const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), finMaterial);
      dorsal.scale.z = 0.1;
      dorsal.rotation.z = -0.35;
      dorsal.position.set(-0.05, 0.2, 0);

      // Cola: grupo con aleta plana en abanico que se agita al nadar.
      const tail = new THREE.Group();
      const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 4), finMaterial);
      tailFin.rotation.z = -Math.PI / 2;
      tailFin.scale.z = 0.12;
      tailFin.position.x = -0.2;
      tail.add(tailFin);
      tail.position.x = -0.42;

      // Ojos a ambos lados del morro.
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1622, roughness: 0.2 });
      const eyeGeometry = new THREE.SphereGeometry(0.05, 12, 12);
      for (const side of [1, -1]) {
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.position.set(0.3, 0.06, side * 0.14);
        fish.add(eye);
      }

      fish.add(body, dorsal, tail);
      fish.position.set(-3 + index * 2, -0.8 + index * 0.45, -1.5);

      fish.userData['speed'] = 0.4 + index * 0.1;
      fish.userData['tail'] = tail;

      this.scene.add(fish);
      this.fish.push(fish);
    }
  }
  private initializeResizeObserver(): void {
    const container = this.headerContainer.nativeElement;

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeRenderer(container);
    });

    this.resizeObserver.observe(container);
  }

  private resizeRenderer(container: HTMLElement): void {
    if (!this.camera || !this.renderer) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
  private animate = (): void => {
    if (!this.scene || !this.camera || !this.renderer) {
      return;
    }

    const time = performance.now() * 0.001;

    this.fish.forEach((fish, index) => {
      const speed = Number(fish.userData['speed'] ?? 0.5);

      fish.position.x += speed * 0.01;

      if (fish.position.x > 4) {
        fish.position.x = -4;
      }

      fish.position.y += Math.sin(time * 2 + index) * 0.002;
      fish.rotation.z = Math.sin(time * 2 + index) * 0.08;

      const tail = fish.userData['tail'] as THREE.Object3D | undefined;
      if (tail) {
        tail.rotation.y = Math.sin(time * 6 + index) * 0.5;
      }
    });

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };
}
