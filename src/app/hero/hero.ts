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

interface FishState {
  readonly group: THREE.Group;
  readonly tail: THREE.Object3D;
  readonly pectorals: readonly THREE.Object3D[];
  dir: number;
  baseY: number;
  baseZ: number;
  readonly bobAmp: number;
  readonly bobFreq: number;
  readonly speed: number;
  readonly phase: number;
}

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class Hero implements AfterViewInit, OnDestroy {

  @ViewChild('headerContainer', { static: true })
  private readonly headerContainer!: ElementRef<HTMLElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;

  private animationFrameId?: number;
  private resizeObserver?: ResizeObserver;
  private readonly fishStates: FishState[] = [];
  private lastFrameTime = 0;

  // Caja donde deambulan los peces (mundo Three). minX/maxX/minY/maxY se recalculan
  // desde el frustum de la cámara para cubrir todo el ancho visible.
  private readonly swimBounds = {
    minX: -4,
    maxX: 4,
    minY: -1.4,
    maxY: 2.4,
    minZ: -2.6,
    maxZ: 0.8,
  };

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

    this.updateSwimBounds();
  }

  // Ajusta la caja de nado al frustum visible (plano de referencia z=0).
  private updateSwimBounds(): void {
    if (!this.camera) {
      return;
    }

    const distance = this.camera.position.z;
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * distance;
    const halfWidth = halfHeight * this.camera.aspect;

    const padX = 0.6;
    const padY = 0.5;

    this.swimBounds.minX = -halfWidth + padX;
    this.swimBounds.maxX = halfWidth - padX;
    // La cámara está en y=1, así que el centro vertical visible es y=1.
    this.swimBounds.minY = this.camera.position.y - halfHeight + padY;
    this.swimBounds.maxY = this.camera.position.y + halfHeight - padY;
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
      { body: 0x5ce1a6, fin: 0xbdf5df },
      { body: 0xffe066, fin: 0xfff2b3 },
    ];

    const bounds = this.swimBounds;

    // Geometrías compartidas entre todos los peces para no recrearlas.
    const bodyGeometry = new THREE.SphereGeometry(0.28, 24, 18);
    const eyeGeometry = new THREE.SphereGeometry(0.045, 12, 12);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1622, roughness: 0.2 });

    // Aleta caudal bifurcada (forma 2D en el plano XY).
    const caudalShape = new THREE.Shape();
    caudalShape.moveTo(0, 0);
    caudalShape.lineTo(-0.36, 0.28);
    caudalShape.lineTo(-0.2, 0);
    caudalShape.lineTo(-0.36, -0.28);
    caudalShape.closePath();
    const caudalGeometry = new THREE.ShapeGeometry(caudalShape);

    const dorsalShape = new THREE.Shape();
    dorsalShape.moveTo(0.18, 0);
    dorsalShape.lineTo(-0.22, 0);
    dorsalShape.lineTo(-0.02, 0.26);
    dorsalShape.closePath();
    const dorsalGeometry = new THREE.ShapeGeometry(dorsalShape);

    const analShape = new THREE.Shape();
    analShape.moveTo(0.02, 0);
    analShape.lineTo(-0.18, 0);
    analShape.lineTo(-0.02, -0.15);
    analShape.closePath();
    const analGeometry = new THREE.ShapeGeometry(analShape);

    const pectoralShape = new THREE.Shape();
    pectoralShape.moveTo(0, 0);
    pectoralShape.lineTo(-0.24, 0.05);
    pectoralShape.lineTo(-0.16, -0.12);
    pectoralShape.closePath();
    const pectoralGeometry = new THREE.ShapeGeometry(pectoralShape);

    for (let index = 0; index < palette.length; index += 1) {
      const colors = palette[index];
      const fish = new THREE.Group();
      fish.rotation.order = 'YZX';

      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: colors.body,
        roughness: 0.35,
        metalness: 0.35,
        emissive: colors.body,
        emissiveIntensity: 0.08,
      });

      const finMaterial = new THREE.MeshStandardMaterial({
        color: colors.fin,
        roughness: 0.6,
        metalness: 0.05,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });

      // Cuerpo fusiforme (torpedo) para una silueta de pez más realista.
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.scale.set(1.95, 0.82, 0.5);
      body.castShadow = true;

      // Cola bifurcada dentro de un grupo que ondula al nadar.
      const tail = new THREE.Group();
      const caudal = new THREE.Mesh(caudalGeometry, finMaterial);
      tail.add(caudal);
      tail.position.set(-0.5, 0, 0);

      const dorsal = new THREE.Mesh(dorsalGeometry, finMaterial);
      dorsal.position.set(-0.05, 0.16, 0);

      const anal = new THREE.Mesh(analGeometry, finMaterial);
      anal.position.set(-0.08, -0.15, 0);

      // Aletas pectorales a ambos lados que aletean al nadar.
      const pectorals: THREE.Object3D[] = [];
      for (const side of [1, -1]) {
        const pivot = new THREE.Group();
        const pectoral = new THREE.Mesh(pectoralGeometry, finMaterial);
        pectoral.rotation.y = (side * Math.PI) / 2;
        pivot.add(pectoral);
        pivot.position.set(0.06, -0.04, side * 0.17);
        pectorals.push(pivot);
        fish.add(pivot);
      }

      for (const side of [1, -1]) {
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.position.set(0.34, 0.07, side * 0.12);
        fish.add(eye);
      }

      fish.add(body, dorsal, anal, tail);

      const dir = Math.random() < 0.5 ? 1 : -1;
      const baseY = THREE.MathUtils.randFloat(bounds.minY + 0.4, bounds.maxY - 0.4);
      const baseZ = THREE.MathUtils.randFloat(bounds.minZ + 0.4, bounds.maxZ - 0.4);

      fish.position.set(
        THREE.MathUtils.randFloat(bounds.minX, bounds.maxX),
        baseY,
        baseZ,
      );
      fish.rotation.y = dir > 0 ? 0 : Math.PI;

      this.scene.add(fish);

      this.fishStates.push({
        group: fish,
        tail,
        pectorals,
        dir,
        baseY,
        baseZ,
        bobAmp: THREE.MathUtils.randFloat(0.12, 0.35),
        bobFreq: THREE.MathUtils.randFloat(0.8, 1.6),
        speed: THREE.MathUtils.randFloat(0.8, 1.7),
        phase: Math.random() * Math.PI * 2,
      });
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
    this.updateSwimBounds();
  }
  private animate = (): void => {
    if (!this.scene || !this.camera || !this.renderer) {
      return;
    }

    const now = performance.now() * 0.001;
    const dt = this.lastFrameTime ? Math.min(now - this.lastFrameTime, 0.05) : 0.016;
    this.lastFrameTime = now;

    const b = this.swimBounds;
    const wrapMargin = 1.4;

    for (const state of this.fishStates) {
      const position = state.group.position;

      // Avance horizontal constante: el pez cruza la pantalla.
      position.x += state.dir * state.speed * dt;

      // Bob vertical y leve deriva en profundidad para un nado natural.
      const bob = Math.sin(now * state.bobFreq + state.phase);
      position.y = state.baseY + bob * state.bobAmp;
      position.z = state.baseZ + Math.sin(now * state.bobFreq * 0.6 + state.phase) * 0.3;

      // Al salir por un lado reaparece por el opuesto con nueva altura/profundidad.
      if (state.dir > 0 && position.x > b.maxX + wrapMargin) {
        position.x = b.minX - wrapMargin;
        state.baseY = THREE.MathUtils.randFloat(b.minY + 0.4, b.maxY - 0.4);
        state.baseZ = THREE.MathUtils.randFloat(b.minZ + 0.4, b.maxZ - 0.4);
      } else if (state.dir < 0 && position.x < b.minX - wrapMargin) {
        position.x = b.maxX + wrapMargin;
        state.baseY = THREE.MathUtils.randFloat(b.minY + 0.4, b.maxY - 0.4);
        state.baseZ = THREE.MathUtils.randFloat(b.minZ + 0.4, b.maxZ - 0.4);
      }

      // Mira hacia donde nada, con leve cabeceo y bandazo.
      const pitch = THREE.MathUtils.clamp(-bob * state.bobAmp * state.bobFreq, -0.35, 0.35);
      state.group.rotation.y = (state.dir > 0 ? 0 : Math.PI) + Math.sin(now * 0.8 + state.phase) * 0.08;
      state.group.rotation.z = pitch * state.dir;
      state.group.rotation.x = 0;

      // Ondulación de cola y aleteo pectoral, con frecuencia según la velocidad.
      state.tail.rotation.y = Math.sin(now * (7 + state.speed * 4) + state.phase) * 0.5;

      const flap = Math.sin(now * 6 + state.phase) * 0.35;
      if (state.pectorals[0]) {
        state.pectorals[0].rotation.x = 0.3 + flap;
      }
      if (state.pectorals[1]) {
        state.pectorals[1].rotation.x = -0.3 - flap;
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };
}
