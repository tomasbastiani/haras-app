<template>
  <section class="ubicacion-section">
    <h2>Ubicación</h2>
    <p>Haras Santa María está ubicado en la localidad de Loma Verde en el partido de Belén de Escobar.</p>

    <h3>Belén de Escobar</h3>
    <p>
      Belén de Escobar es una ciudad situada en el nordeste de la provincia de Buenos Aires, Argentina. Se encuentra ubicada en el centro del partido de Escobar, del cual es su cabecera, en la intersección de la ruta provincial 25 y la ruta Panamericana, a unos 50 km de la ciudad de Buenos Aires.
    </p>

    <h3>Loma Verde</h3>
    <p>
      Se extiende a ambos lados de la ruta nacional 9, entre el kilómetro 52 y 58. La superficie aproximada de 16 km² que se recuestan sobre los bañados del rí­o Lujan.
    </p>

    <p>Panamericana Ramal Escobar km 54</p>

    <img :src="mapa" alt="Mapa ubicación Haras Santa María" />
  </section>
</template>

<script setup>
import mapa from '@/assets/img/map.PNG';
</script>

<style scoped>
.ubicacion-section {
  max-width: 900px;
  margin: 50px auto;
  padding: 0 20px;
}

.ubicacion-section h2 {
  font-size: 2.4rem;
  margin-bottom: 20px;
}

.ubicacion-section h3 {
  font-size: 1.6rem;
  margin-top: 25px;
  margin-bottom: 10px;
}

.ubicacion-section p {
  font-size: 1.1rem;
  line-height: 1.5;
  margin-bottom: 15px;
}

.ubicacion-section img {
  width: 100%;
  max-width: 700px;
  margin-top: 20px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}
</style>
