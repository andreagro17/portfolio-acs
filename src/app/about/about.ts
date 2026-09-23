/*
 * Importaciones de Angular:
 *
 * - AfterViewInit / OnDestroy: hooks del ciclo de vida del componente.
 * - Component / ChangeDetectionStrategy: para declarar el componente.
 * - ElementRef / ViewChild: para acceder a un elemento del HTML.
 * - signal: estado reactivo (usamos uno para el popup de información).
 * - Inject / PLATFORM_ID: para saber si estamos en navegador o servidor.
 */
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, signal, OnDestroy, ViewChild, Inject, PLATFORM_ID, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../services/theme.service';
import { SketchService } from '../services/sketch.service';

/*
 * Three.js y sus utilidades:
 *
 * - THREE: librería principal de gráficos 3D.
 * - GLTFLoader / GLTF: para cargar modelos 3D en formato .glb.
 * - OrbitControls: permite girar y hacer zoom con el ratón.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FloatingItem, FloatingItemConfig, ItemInfo } from '../models/floating-item.model';
import { FLOATING_ITEM_CONFIGS } from '../config/floating-items.config';
import { ABOUT_BIO, SKILL_GROUPS, EXPERIENCE } from '../config/about.config';



@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About implements AfterViewInit, OnDestroy {

  /*
   * @ViewChild busca en about.html el elemento marcado con #avatarContainer.
   * Ahí dentro insertaremos el <canvas> que genera Three.js.
   * El símbolo ! indica a TypeScript que Angular lo inicializará a tiempo.
   */
  @ViewChild('avatarContainer', { static: true })
  avatarContainer!: ElementRef<HTMLDivElement>;

  // Objetos principales de Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  // Controles de órbita: girar y hacer zoom con el ratón
  private controls!: OrbitControls;

  // Avatar central y el progreso de su vuelta inicial (0 a 1)
  private avatar?: THREE.Object3D;
  private avatarProgress = 0;

  // Material del avatar, que reutilizamos en los items para un look homogéneo
  private avatarMaterial?: THREE.Material;

  // Variante en wireframe para modelos sin UVs (evita que se oculten)
  private avatarMaterialSolid?: THREE.Material;

  // Lista de objetos flotantes ya cargados en la escena
  private floatingItems: FloatingItem[] = [];

  /*
   * Raycaster + pointer se usan para detectar clics sobre los objetos 3D.
   * El raycaster lanza un "rayo" desde la cámara hacia donde apunta el ratón.
   */
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  // Identificador del bucle de animación, para poder detenerlo al destruir
  private animationId?: number;

  // Servicio de tema (claro / oscuro) para adaptar el fondo de la escena.
  private readonly themeService = inject(ThemeService);

  // Servicio del efecto boceto: alterna la textura de los items.
  private readonly sketch = inject(SketchService);

  /*
   * selectedInfo es un signal que guarda la info del objeto pulsado.
   * Cuando tiene valor, el HTML muestra el popup; cuando es null, se oculta.
   */
  readonly selectedInfo = signal<ItemInfo | null>(null);

  /*
   * Configuración de los objetos flotantes (definida fuera del componente).
   */
  private readonly itemConfigs: FloatingItemConfig[] = FLOATING_ITEM_CONFIGS;

  // Contenido textual de la sección "Sobre mí".
  protected readonly bio = ABOUT_BIO;
  protected readonly skills = SKILL_GROUPS;
  protected readonly experience = EXPERIENCE;

  // Referencia al elemento del componente (contenedor con scroll).
  private readonly host = inject(ElementRef<HTMLElement>);

  /* Desplaza el propio contenedor hasta el contenido, sin usar anclas
     nativas (#hash) que moverían ancestros con overflow:hidden y
     empujarían el header fuera de vista. */
  protected scrollToContent(): void {
    const hostEl = this.host.nativeElement;
    const target = hostEl.querySelector('#sobre-mi') as HTMLElement | null;
    hostEl.scrollTo({
      top: target ? target.offsetTop : hostEl.clientHeight,
      behavior: 'smooth',
    });
  }


  /*
   * Inyectamos PLATFORM_ID para poder distinguir entre:
   * - Navegador: existe WebGL, window y document.
   * - Servidor (SSR): no existen, así que evitamos ejecutar Three.js.
   */
  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    // Cuando cambia el tema, actualizamos el color de fondo de la escena.
    effect(() => {
      const color = this.sceneColor(this.themeService.theme());
      if (this.scene) {
        this.scene.background = new THREE.Color(color);
      }
    });

    // Cuando se activa/desactiva el efecto, re-aplicamos el material a cada item.
    effect(() => {
      this.sketch.enabled();
      for (const item of this.floatingItems) {
        this.applyItemStyle(item);
      }
    });
  }

  // Color de fondo de la escena 3D segun el tema actual.
  private sceneColor(theme: 'light' | 'dark'): string {
    return theme === 'dark' ? '#0b1220' : '#f3f4f6';
  }

  /*
   * ngAfterViewInit se ejecuta cuando Angular ya creó el HTML.
   * Es el momento correcto para acceder a #avatarContainer.
   */
  ngAfterViewInit(): void {
    // Durante SSR no hay WebGL: salimos sin inicializar Three.js.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // 1) Preparar escena, cámara, renderer, luces y controles
    this.initThree();
    // 2) Cargar el avatar central
    this.loadAvatar();
    // 3) Cargar los objetos flotantes definidos en itemConfigs
    this.loadItems();
    // 4) Arrancar el bucle de animación
    this.animate();
    // 5) Escuchar clics sobre el canvas para mostrar el popup
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);
    // 6) Ajustar el canvas al tamaño de la ventana y redibujar al volver a la pestaña
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    console.log('Componente About view inicializado');
  }

  /*
   * ngOnDestroy libera recursos cuando el componente desaparece,
   * para evitar fugas de memoria y procesos en segundo plano.
   */
  ngOnDestroy(): void {
    // Detener el bucle de animación
    if (this.animationId !== undefined) {
      cancelAnimationFrame(this.animationId);
    }
    // Quitar los listeners y liberar controles y renderer
    this.renderer?.domElement.removeEventListener('click', this.onCanvasClick);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  /*
   * Reajusta cámara y renderer cuando cambia el tamaño de la ventana.
   * Necesario porque el canvas ocupa toda la pantalla de forma fija.
   */
  private readonly onResize = (): void => {
    const container = this.avatarContainer?.nativeElement;
    if (!container || !this.renderer || !this.camera) {
      return;
    }
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.render(this.scene, this.camera);
  };

  /*
   * Al volver a la pestaña, requestAnimationFrame estaba pausado.
   * Redibujamos un frame para que la escena aparezca de inmediato.
   */
  private readonly onVisibilityChange = (): void => {
    if (!document.hidden && this.renderer) {
      this.onResize();
    }
  };

  /*
   * initThree crea los elementos básicos de una escena 3D:
   * escena, cámara, renderer, controles de ratón y luces.
   */
  private initThree(): void {
    // Elemento HTML donde insertaremos el canvas
    const container = this.avatarContainer.nativeElement;

    // La escena contiene todos los objetos, luces y cámaras
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.sceneColor(this.themeService.theme()));

    /*
     * Cámara en perspectiva. Parámetros:
     * - 45: campo de visión (grados)
     * - aspect: proporción ancho/alto del contenedor
     * - 0.1 y 100: distancias mínima y máxima visibles
     */
    this.camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 1.4, 3)

    /*
     * El renderer dibuja la escena en un <canvas>.
     * alpha: true permite fondo transparente si se desea.
     */
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    // El canvas ocupa el tamaño del contenedor
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    // Limitamos el pixel ratio para no sobrecargar la GPU en pantallas Retina
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Insertamos el canvas generado por Three.js en el HTML
    container.appendChild(this.renderer.domElement);

    /*
     * OrbitControls permite girar el modelo y hacer zoom con el ratón.
     * - enableDamping: movimiento suave con inercia.
     * - enablePan: desactivado para que solo rote y haga zoom.
     * - target: punto al que mira la cámara (el centro).
     */
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);

    // Luz ambiental: ilumina todo por igual, sin sombras
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);

    // Luz direccional: da volumen y un lado más iluminado
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(2, 3, 4);
    this.scene.add(directionalLight);
  }

  /*
   * loadAvatar carga el modelo principal (el avatar) y coloca
   * la cámara a una distancia adecuada según su tamaño.
   */
  private loadAvatar(): void {
    const loader = new GLTFLoader();

    loader.load(
      '/avatar.glb',
      (gltf: GLTF) => {
        const avatar = gltf.scene;

        avatar.position.set(0, 0, 0);
        avatar.scale.setScalar(1.5);

        // La caja envolvente nos da centro y tamaño del modelo
        const box = new THREE.Box3().setFromObject(avatar);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Restamos el centro para dejar el modelo centrado en el origen
        avatar.position.sub(center);

        this.avatar = avatar;
        this.scene.add(avatar);

        /*
         * Guardamos el material del avatar (el primero que encontremos)
         * para reutilizarlo en los items y que todos compartan la misma
         * textura. Lo aplicamos también a los items ya cargados.
         */
        avatar.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && !this.avatarMaterial) {
            const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            const clone = material.clone();
            // Doble cara: evita que modelos finos (p.ej. trigo) desaparezcan
            clone.side = THREE.DoubleSide;
            this.avatarMaterial = clone;

            /*
             * Respaldo para mallas SIN coordenadas UV: la textura del avatar
             * las dejaría invisibles, así que usamos un wireframe opaco que
             * conserva el aire "de líneas" y siempre se ve.
             */
            const solid = material.clone() as THREE.MeshStandardMaterial;
            solid.side = THREE.DoubleSide;
            solid.map = null;
            solid.transparent = false;
            solid.opacity = 1;
            solid.depthWrite = true;
            solid.wireframe = true;
            this.avatarMaterialSolid = solid;
          }
        });
        for (const item of this.floatingItems) {
          this.applyItemStyle(item);
        }

        // Distancia de cámara proporcional al tamaño del modelo
        const maxSize = Math.max(size.x, size.y, size.z);
        const distance = maxSize * 2.2;

        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0);

        // Dibujamos ya un frame: si rAF está pausado, el avatar se ve igual.
        this.renderer.render(this.scene, this.camera);
      },
      undefined,
      (error: unknown) => {
        console.error('No se pudo cargar el avatar:', error);
      }
    );
  }

  /*
   * applyItemStyle decide qué material lleva un item:
   * - efecto activo: usa el material del avatar (misma textura).
   * - efecto inactivo: restaura su material original.
   */
  private applyItemStyle(item: FloatingItem): void {
    const useSketch = this.sketch.enabled();
    item.model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      if (useSketch && this.avatarMaterial) {
        // Sin UVs la textura del avatar no se puede mapear: usamos el wireframe.
        const hasUV = !!mesh.geometry.attributes['uv'];
        mesh.material = hasUV ? this.avatarMaterial : (this.avatarMaterialSolid ?? this.avatarMaterial);
      } else {
        const original = item.originalMaterials.get(mesh);
        if (original) {
          mesh.material = original;
        }
      }
    });
  }

  /*
   * loadItems recorre itemConfigs y carga cada modelo .glb.
   * Para cada uno: lo centra, lo orienta, normaliza su tamaño,
   * lo mete en un grupo con una esfera de cristal y lo añade a la escena.
   */
  private loadItems(): void {
    const loader = new GLTFLoader();

    // Un mismo cargador sirve para todos los modelos
    for (const config of this.itemConfigs) {
      loader.load(
        config.url,
        (gltf: GLTF) => {
          const model = gltf.scene;

          // Caja envolvente: centro y tamaño del modelo
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          // Centrar el modelo en su propio origen
          model.position.sub(center);

          // Orientación estática opcional (si la config la define)
          if (config.rotation) {
            model.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
          }

          /*
           * Normalizamos el tamaño: dividimos la escala deseada entre la
           * dimensión mayor para que todos los objetos midan lo mismo,
           * sin importar el tamaño original del .glb.
           */
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = maxDim > 0 ? config.scale / maxDim : config.scale;

          /*
           * Envolvemos el modelo en un grupo. Así podemos escalar, mover
           * y girar el grupo en la animación sin romper el centrado interno.
           */
          const group = new THREE.Group();
          group.add(model);

          // Guardamos los materiales originales para poder alternar el efecto
          const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
          model.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
              originalMaterials.set(mesh, mesh.material);
            }
          });

          // Esfera de cristal translúcida que envuelve el objeto
          const bubbleRadius = maxDim * 0.75;
          const bubble = new THREE.Mesh(
            new THREE.SphereGeometry(bubbleRadius, 32, 32),
            new THREE.MeshStandardMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.15,
              roughness: 0.05,
              metalness: 0,
            })
          );
          group.add(bubble);

          // Colocamos el grupo y lo empezamos casi invisible (crecerá al animar)
          group.position.set(config.position[0], config.position[1], config.position[2]);
          group.scale.setScalar(0.001);

          this.scene.add(group);
          // Guardamos el item para animarlo y detectar clics después
          const item: FloatingItem = { config, group, model, originalMaterials, targetScale, progress: 0 };
          // Aplicamos el estilo actual (normal o efecto boceto)
          this.applyItemStyle(item);
          this.floatingItems.push(item);
        },
        undefined,
        (error: unknown) => {
          console.error(`No se pudo cargar ${config.url}:`, error);
        }
      );
    }
  }

  /*
   * onCanvasClick detecta si el usuario ha pulsado un objeto 3D.
   * Es una función flecha para conservar el 'this' al usarla como listener.
   */
  private onCanvasClick = (event: MouseEvent): void => {
    // Convertimos la posición del ratón a coordenadas normalizadas (-1 a 1)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Lanzamos un rayo desde la cámara a través del puntero
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Comprobamos qué grupos de objetos cruza el rayo
    const groups = this.floatingItems.map((item) => item.group);
    const intersects = this.raycaster.intersectObjects(groups, true);

    // Si no golpea nada, no hacemos nada
    if (intersects.length === 0) {
      return;
    }

    /*
     * El rayo golpea una malla interna; subimos por la jerarquía
     * (parent) hasta encontrar el grupo que pertenece a un item.
     */
    let object: THREE.Object3D | null = intersects[0].object;
    while (object) {
      const hit = this.floatingItems.find((item) => item.group === object);
      if (hit) {
        // Guardamos su info en el signal: el HTML mostrará el popup
        this.selectedInfo.set(hit.config.info);
        return;
      }
      object = object.parent;
    }
  };

  // closeInfo pone el signal a null y así se oculta el popup
  closeInfo(): void {
    this.selectedInfo.set(null);
  }

  /*
   * animate es el bucle que se ejecuta en cada frame (~60 veces/seg).
   * Aquí actualizamos animaciones y volvemos a dibujar la escena.
   */
  private animate(): void {
    // Programamos el siguiente frame y guardamos su id para poder cancelarlo
    this.animationId = requestAnimationFrame(() => this.animate());

    // Animación de entrada de cada objeto flotante (de progress 0 a 1)
    for (const item of this.floatingItems) {
      if (item.progress < 1) {
        // Avanzamos el progreso según su velocidad, sin pasar de 1
        item.progress = Math.min(item.progress + (item.config.speed ?? 0.0015), 1);

        // Suavizamos el progreso con una curva de aceleración/desaceleración
        const progress = this.easeInOutCubic(item.progress);

        // Crece, flota hacia arriba y da una vuelta completa al entrar
        item.group.scale.setScalar(progress * item.targetScale);
        item.group.position.y = item.config.position[1] + progress * (item.config.floatHeight ?? 0.3);
        item.group.rotation.y = progress * Math.PI * 2;
      }
    }

    // El avatar da una sola vuelta suave al inicio y luego se queda quieto
    if (this.avatar && this.avatarProgress < 1) {
      this.avatarProgress = Math.min(this.avatarProgress + 0.005, 1);
      this.avatar.rotation.y = this.easeInOutCubic(this.avatarProgress) * Math.PI * 2;
    }
    // Actualizamos los controles (necesario por el damping) y renderizamos
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /*
   * easeInOutCubic transforma un valor lineal (0 a 1) en una curva
   * que arranca y termina despacio, para animaciones más naturales.
   */
  private easeInOutCubic(value: number): number {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }
}
