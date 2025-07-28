<template>
  <div class="home-container">
    <!-- Carrusel -->
    <div class="carousel-wrapper">
      <div class="carousel-background"></div>
      <v-carousel
        cycle
        hide-delimiter-background
        height="400"
        show-arrows-on-hover
        :interval="3000"
      >
        <v-carousel-item v-for="(img, i) in sliderImages" :key="i">
          <div class="carousel-img-container">
            <img :src="img" class="carousel-img" alt="slider" />
          </div>
        </v-carousel-item>
      </v-carousel>
    </div>

    <!-- Sección Nosotros -->
    <section class="info-section" id="nosotros">
      <h2 class="section-title">Nosotros</h2>
      <p class="section-paragraph">
        Somos un barrio privado ubicado en la Localidad de Loma Verde en el partido de Belén de Escobar.
      </p>
      <ul class="section-list">
        <li>Con una extensión de 360 has</li>
        <li>1650 lotes</li>
        <li>Contamos con una amplia infraestructura deportiva</li>
        <li>Cancha de golf de 18 hoyos</li>
        <li>17 canchas de tenis con quincho deportivo</li>
        <li>2 canchas de futbol de 11 jugadores de césped natural y una de sintético</li>
        <li>Sector de hípica</li>
        <li>Un club house familiar que cuenta con gimnasio, 2 piscinas, vestuarios, amplio restaurant, microcine y sector de juegos para niños</li>
        <li>Club house en el sector de golf que cuenta con una piscina in/out, sauna, vestuario, restaurant.</li>
      </ul>
    </section>

    <!-- Sección Ubicación -->
    <section class="info-section" id="como-llegar">
      <h2 class="section-title">Ubicación</h2>
      <p class="section-paragraph">
        Haras Santa María está ubicado en la localidad de Loma Verde en el partido de Belén de Escobar.
      </p>

      <h3 class="section-subtitle">Belén de Escobar</h3>
      <p class="section-paragraph">
        Belén de Escobar es una ciudad situada en el nordeste de la provincia de Buenos Aires, Argentina. Se encuentra ubicada en el centro del partido de Escobar, del cual es su cabecera, en la intersección de la ruta provincial 25 y la ruta Panamericana, a unos 50 km de la ciudad de Buenos Aires.
      </p>

      <h3 class="section-subtitle">Loma Verde</h3>
      <p class="section-paragraph">
        Se extiende a ambos lados de la ruta nacional 9, entre el kilómetro 52 y 58. La superficie aproximada de 16 km² que se recuestan sobre los bañados del río Luján.
      </p>

      <p class="section-paragraph">Panamericana Ramal Escobar km 54</p>
      <img :src="mapa" alt="Mapa ubicación Haras Santa María" class="map-image" />
    </section>
  </div>
</template>

<script setup>
import slider1 from '@/assets/img/slider1.jpg';
import slider2 from '@/assets/img/slider2.jpg';
import slider3 from '@/assets/img/slider3.jpg';
import slider4 from '@/assets/img/slider4.jpg';
import slider5 from '@/assets/img/slider5.jpg';
import slider6 from '@/assets/img/slider6.jpg';
import slider7 from '@/assets/img/slider7.jpg';
import slider8 from '@/assets/img/slider8.jpg';
import slider9 from '@/assets/img/slider9.jpg';
import fondoSlider from '@/assets/img/fondoslider.png';
import mapa from '@/assets/img/map.PNG';

const sliderImages = [
  slider1, slider2, slider3, slider4, slider5, slider6, slider7, slider8, slider9
];
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Roboto', sans-serif;
  color: #333;
}

.carousel-wrapper {
  width: 100%;
  height: 600px; /* 🔼 Aumentamos la altura total */
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center; /* 🔄 Centra el carrusel verticalmente */
  justify-content: center; /* (opcional) centrado horizontal */
}

.carousel-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%; /* Ahora toma toda la altura de carousel-wrapper */
  background-image: url('@/assets/img/fondoslider.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: brightness(0.4);
  z-index: 0;
}

.v-carousel {
  position: relative;
  z-index: 1;
  width: 100%;
  /* max-width: 1200px; */
  height: 400px; /* 🔽 Mantiene el tamaño original del carrusel */
}

.carousel-img-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.carousel-img {
  width: auto;
  height: 100%;
  /* max-height: 100%; */
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.info-section {
  max-width: 900px;
  padding: 40px 20px;
}

.section-title {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 20px;
  border-bottom: 3px solid #ff8328;
  display: inline-block;
}

.section-subtitle {
  font-size: 1.5rem;
  margin-top: 25px;
  color: #34495e;
}

.section-paragraph {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 15px;
}

.section-list {
  list-style: disc;
  padding-left: 20px;
  font-size: 1.1rem;
  line-height: 1.6;
}

.map-image {
  width: 100%;
  max-width: 600px;
  margin-top: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
</style>
