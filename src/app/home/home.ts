import { 
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject
 } from '@angular/core';
 import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';


@Component({
  imports: [],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home implements AfterViewInit, OnDestroy {
  /*
   * @ViewChild busca en home.html un elemento que tenga:
   *
   * <div #sceneContainer></div>
   *
   * static: true permite acceder al elemento desde el ciclo de vida
   * del componente.
   *
   * El símbolo ! indica a TypeScript que Angular inicializará esta
   * propiedad antes de utilizarla.
   */
  @ViewChild('sceneContainer', { static: true })

  private readonly sceneContainer!: ElementRef<HTMLDivElement>;
 
  /*
   * PLATFORM_ID permite saber si el código se ejecuta:
   *
   * - En el navegador
   * - En el servidor, durante SSR
   *
   * Three.js necesita APIs del navegador como window y WebGL.
   */
  
  private readonly platformId = inject(PLATFORM_ID);

  // Objetos principales de Three.js

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private cube?: THREE.Mesh;

  /*
   * requestAnimationFrame devuelve un identificador.
   * Lo guardamos para poder detener la animación posteriormente.
   */
  private animationFrameId?: number;

  /*
   * ResizeObserver detecta cambios de tamaño en el contenedor.
   * Así podemos adaptar la cámara y el canvas.
   */
  private resizeObserver?: ResizeObserver;

   /*
   * ngAfterViewInit se ejecuta cuando Angular ya ha creado el HTML.
   *
   * Es el momento correcto para acceder a #sceneContainer,
   * porque antes de este punto el elemento todavía podría no existir.
   */
  ngAfterViewInit(): void {
    /*
     * Durante SSR no existe WebGL ni window.
     * Por eso Three.js solo se inicializa en el navegador.
     */
    if (!isPlatformBrowser(this.platformId)) {
      return
    }
    // Creamos la escena, cámara, renderer y cubo
    this.initializeScene();
    // Observamos cambios de tamaño del contenedor
    this.initializeResizeObserver();
    // Iniciamos el bucle de animación
    this.animate();
    
  }
  /*
   * ngOnDestroy se ejecuta cuando Angular elimina el componente.
   *
   * Es importante liberar recursos de Three.js para evitar:
   *
   * - Fugas de memoria
   * - Animaciones ejecutándose en segundo plano
   * - Consumo innecesario de GPU
   */
  ngOnDestroy(): void {
    // Detenemos el bucle de animación
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Dejamos de observar cambios de tamaño
    this.resizeObserver?.disconnect();

    // Liberamos la geometría del cubo
    this.cube?.geometry.dispose();

    /*
     * El material también ocupa memoria en la GPU.
     * Lo liberamos cuando el componente desaparece.
     */
    if (this.cube?.material instanceof THREE.Material) {
      this.cube.material.dispose();
    }

    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }

  /*
   * initializeScene prepara todos los elementos necesarios
   * para representar una escena 3D.
   */
  private initializeScene(): void {
    // Obtenemos el elemento HTML donde insertaremos el canvas
    const container = this.sceneContainer.nativeElement;

    /*
     * La escena es el contenedor de todos los objetos 3D:
     *
     * - Cubos
     * - Modelos
     * - Luces
     * - Cámaras
     */
    this.scene = new THREE.Scene();

    // Color de fondo de la escena

    this.scene.background = new THREE.Color(0x101820);

    /*
     * La cámara define lo que verá el usuario.
     *
     * Parámetros:
     * - 75: campo de visión
     * - aspect: proporción ancho/alto
     * - 0.1: distancia mínima visible
     * - 100: distancia máxima visible
     */
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.getAspectRatio(container),
      0.1,
      100,
    );

    // Alejamos la cámara para poder ver el cubo
    this.camera.position.set(0, 0, 3);

    /*
     * El renderer convierte la escena 3D en píxeles dentro
     * de un elemento <canvas>.
     */
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

     /*
     * Adaptamos la calidad a la pantalla, pero limitamos el valor
     * para evitar un consumo excesivo de GPU en pantallas Retina.
     */
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // El canvas ocupa el tamaño del contenedor
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    // Configuración correcta de color para mostrar colores naturales
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Insertamos el canvas generado por Three.js en el HTML
    container.appendChild(this.renderer.domElement);
    
    /*
     * La geometría define la forma del objeto.
     * En este caso creamos un cubo de 1 x 1 x 1.
     */
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    /*
     * El material define el aspecto visual del objeto:
     *
     * - color: color principal
     * - roughness: rugosidad
     * - metalness: apariencia metálica
     */
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      roughness: 0.35,
      metalness: 0.1,
    });
/*
     * Mesh combina geometría y material.
     * Esta combinación representa el objeto 3D completo.
     */
    this.cube = new THREE.Mesh(geometry, material);

    // Añadimos el cubo a la escena
    this.scene.add(this.cube);

    /*
     * MeshStandardMaterial necesita iluminación para verse correctamente.
     */
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      3,
    );

    // Posición de la luz direccional
    directionalLight.position.set(2, 2, 4);

    // Añadimos las luces a la escena
    this.scene.add(ambientLight, directionalLight);
  }
 /*
   * Configura un observador que detecta cambios de tamaño
   * en el contenedor de la escena.
   */
  private initializeResizeObserver(): void {
    const container = this.sceneContainer.nativeElement;

    this.resizeObserver = new ResizeObserver(() => {
      // Cada vez que cambia el tamaño, actualizamos la escena
      this.resizeRenderer(container);
    });

    this.resizeObserver.observe(container);
  }

  /*
   * Mantiene la cámara y el canvas sincronizados con el contenedor.
   */

  private resizeRenderer(container: HTMLDivElement): void {
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
  /*
   * Bucle principal de Three.js.
   *
   * Este método se ejecuta aproximadamente 60 veces por segundo.
   */
  private animate = (): void => {
    if (!this.cube || !this.scene || !this.camera || !this.renderer) {
      return;
    }

    // Modificamos la rotación del cubo en cada frame
    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;

    /*
     * Render dibuja la escena desde el punto de vista de la cámara.
     */
    this.renderer.render(this.scene, this.camera);

    /*
     * Programamos el siguiente frame y guardamos su identificador
     * para poder cancelarlo en ngOnDestroy.
     */
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /*
   * Calcula la proporción entre el ancho y el alto del contenedor.
   *
   * Math.max evita dividir entre cero si el contenedor todavía
   * no tiene altura.
   */
  private getAspectRatio(container: HTMLDivElement): number {
    return container.clientWidth / Math.max(container.clientHeight, 1);
  }

}
