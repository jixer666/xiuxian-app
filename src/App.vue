<script setup lang="ts">
import { onHide } from '@dcloudio/uni-app'
import { useGameStore } from '@/store/game'

onHide(() => useGameStore().pauseBattle())
</script>

<style lang="scss">
page {
  height: 100%;
}
</style>
