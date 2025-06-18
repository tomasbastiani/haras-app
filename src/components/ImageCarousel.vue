<template>
  <div class="carousel-background">
    <div class="carousel">
      <div class="carousel-inner" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
        <div class="carousel-item" v-for="(image, index) in images" :key="index">
          <img :src="image" :alt="'Slide ' + (index + 1)" />
        </div>
      </div>

      <div class="carousel-dots">
        <span
          v-for="(image, index) in images"
          :key="'dot-' + index"
          :class="{ active: currentIndex === index }"
          @click="goToSlide(index)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
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

const images = [slider1, slider2, slider3, slider4, slider5, slider6, slider7, slider8, slider9];

const currentIndex = ref(0);
let intervalId;

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % images.length;
};

const goToSlide = (index) => {
  currentIndex.value = index;
};

onMounted(() => {
  intervalId = setInterval(nextSlide, 4000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});

</script>

<style scoped>
.carousel-background {
  width: 100%;
  background-image: url('@/assets/img/fondoslider.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 40px 0;
  position: relative;
}

.carousel-background::before {
  content: "";
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5); /* oscurece fondo */
  z-index: 0;
}

.carousel {
  position: relative;
  z-index: 1; /* por encima del fondo oscuro */
  overflow: hidden;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  aspect-ratio: 16 / 9;
}

.carousel-inner {
  display: flex;
  transition: transform 0.6s ease-in-out;
  height: 100%;
}

.carousel-item {
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-item img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.4s ease;
}

.carousel-item img:hover {
  transform: scale(1.02);
}

.carousel-dots {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 2;
}

.carousel-dots span {
  width: 12px;
  height: 12px;
  background-color: #ffffff99;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.carousel-dots span.active {
  background-color: #fff;
}

</style>
