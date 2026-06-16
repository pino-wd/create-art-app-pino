<!-- 403页面 -->
<script setup lang="ts">
import ArtException from '@/components/core/views/exception/ArtException.vue'
import imgUrl from '@imgs/svg/403.svg'

defineOptions({ name: 'Exception403' })
</script>

<template>
  <ArtException
    :data="{
      title: '403',
      desc: $t('exceptionPage.403'),
      btnText: $t('exceptionPage.gohome'),
      imgUrl,
    }"
  />
</template>
