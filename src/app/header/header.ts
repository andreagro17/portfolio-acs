import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
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
})

export class Header implements AfterViewInit, OnDestroy {

  @ViewChild('headerContainer', { static: true })
  private readonly headerContainer!: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);

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
    this.animate();
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
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

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

    for (let index = 0; index < 4; index += 1) {
      const fish = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 8),
        new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? 0xffb86c : 0xff79c6,
          roughness: 0.4,
        }),
      );

      body.scale.x = 1.5;

      const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.45, 3),
        new THREE.MeshStandardMaterial({
          color: 0x50fa7b,
          roughness: 0.4,
        }),
      );

      tail.rotation.z = -Math.PI / 2;
      tail.position.x = -0.45;

      fish.add(body, tail);
      fish.position.set(
        -3 + index * 2,
        -0.8 + index * 0.45,
        -1.5,
      );

      fish.userData['speed'] = 0.4 + index * 0.1;
      fish.castShadow = true;

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
    });

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };
}
