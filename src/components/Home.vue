<template>
  <div class="home-container">
    <!-- Hero / Carrusel fullscreen -->
    <section class="hero-section">
      <v-carousel
        cycle
        hide-delimiter-background="false"
        show-arrows
        height="100vh"
        :interval="4000"
      >
        <v-carousel-item v-for="(img, i) in sliderImages" :key="i">
          <div class="carousel-img-container">
            <img :src="img" class="carousel-img" alt="slider" />
            <div class="carousel-text-overlay">
              <h1>Haras Santa María</h1>
              <p>Un lugar único para vivir y disfrutar</p>
            </div>
          </div>
        </v-carousel-item>
      </v-carousel>
    </section>

    <!-- Sección Nosotros -->
    <section class="info-section" id="nosotros">
      <h2 class="section-title">Nosotros</h2>
      <p class="section-paragraph">
        Somos un barrio privado ubicado en Loma Verde, partido de Belén de Escobar.
      </p>
      <div class="cards-grid">
        <div class="info-card" v-for="(item, i) in nosotrosItems" :key="i">
          <p>{{ item }}</p>
        </div>
      </div>
    </section>

    <!-- Sección Ubicación -->
    <section class="info-section" id="como-llegar">
      <h2 class="section-title">Ubicación</h2>
      <p class="section-paragraph">
        Haras Santa María está ubicado en Loma Verde, partido de Belén de Escobar.
      </p>
      <div class="location-grid">
        <div class="location-item">
          <h3 class="section-subtitle">Belén de Escobar</h3>
          <p class="section-paragraph">
            Ciudad situada en el nordeste de la provincia de Buenos Aires, a 50 km de la ciudad de Buenos Aires.
          </p>
        </div>
        <div class="location-item">
          <h3 class="section-subtitle">Loma Verde</h3>
          <p class="section-paragraph">
            Se extiende a ambos lados de la ruta nacional 9, entre km 52 y 58, sobre los bañados del río Luján. Panamericana Ramal Escobar km 54
          </p>
        </div>
      </div>
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
import mapa from '@/assets/img/map.PNG';

const sliderImages = [slider1, slider2, slider3, slider4, slider5, slider6, slider7, slider8, slider9];

const nosotrosItems = [
  "Extensión de 360 has",
  "1650 lotes",
  "Amplia infraestructura deportiva",
  "Cancha de golf de 18 hoyos",
  "17 canchas de tenis con quincho deportivo",
  "2 canchas de fútbol de 11 jugadores y 1 de sintético",
  "Sector de hípica",
  "Club house familiar con gimnasio, piscinas, restaurant, microcine y sector de juegos",
  "Club house de golf con piscina in/out, sauna y restaurant"
];
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');

.home-container {
  font-family: 'Montserrat', sans-serif;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Carrusel fullscreen */
.hero-section {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}
.v-carousel {
  height: 100vh;
}
.carousel-img-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.carousel-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.carousel-text-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #fff;
  z-index: 2;
  text-shadow: 0 2px 10px rgba(0,0,0,0.7);
}
.carousel-text-overlay h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.carousel-text-overlay p {
  font-size: 1.2rem;
  font-weight: 500;
}

/* Secciones de información */
.info-section {
  max-width: 1000px;
  width: 100%;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.section-title {
  font-size: 2.5rem;
  margin-bottom: 25px;
  color: #ff8328;
  border-bottom: 3px solid #ff8328;
  display: inline-block;
}
.section-subtitle {
  font-size: 1.5rem;
  margin-top: 20px;
  color: #34495e;
}
.section-paragraph {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 20px;
  text-align: center;
}

/* Grid para nosotros */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 30px;
  width: 100%;
}
.info-card {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}
.info-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

/* Grid para ubicación */
.location-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
  width: 100%;
  justify-items: center;
  margin-top: 30px;
}

/* Mapa */
.map-image {
  width: 100%;
  max-width: 700px;
  margin-top: 30px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .carousel-text-overlay h1 {
    font-size: 2rem;
  }
  .carousel-text-overlay p {
    font-size: 1rem;
  }
  .location-grid {
    grid-template-columns: 1fr;
  }
}
</style>
