<!-- 404页面 -->
<script setup lang="ts">
import imgUrl from '@imgs/svg/404.svg'
import ArtException from '@/components/core/views/exception/ArtException.vue'

defineOptions({ name: 'Exception404' })
</script>

<template>
  <ArtException
    :data="{
      title: '404',
      desc: $t('exceptionPage.404'),
      btnText: $t('exceptionPage.gohome'),
      imgUrl,
    }"
  />
</template>
