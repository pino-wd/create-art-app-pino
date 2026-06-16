<!-- 404页面 -->
<script setup lang="ts">
import ArtException from '@/components/core/views/exception/ArtException.vue'
import imgUrl from '@imgs/svg/404.svg'

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
