<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/store/game'
import GameIcon from './GameIcon.vue'
import referenceContent from '@/game/reference-content.json'

const game = useGameStore()
const tab = ref('炼丹')
const root = ref(0)
const b = computed(() => game.save.buildings.find(b => b.id === game.detailId)!)
const spirit = computed(
  () =>
    referenceContent.lianshen.find(v => v.level === b.value.level)
    || referenceContent.lianshen[0],
)
const roots = ['金', '木', '水', '火', '土']
const anchors = [
  [330, 30],
  [540, 160],
  [450, 460],
  [210, 460],
  [120, 160],
]
const remaining = computed(() =>
  Math.max(0, Math.ceil(((game.save.craft?.ends || 0) - game.now) / 1000)),
)
function study(): void {
  if (game.spend({ energy: 100 })) {
    game.reward({ exp: b.value.level * 500 })
    game.notify(`修为 +${b.value.level * 500}`)
  }
}
function rootUpgrade(): void {
  if (game.spend({ energy: 100 * b.value.level })) {
    b.value.level++
    game.notify(`${roots[root.value]}系灵根提升`)
  }
}
function craft(): void {
  game.buildingAction(tab.value === '炼器' ? 'forge' : 'alchemy', 'pill')
}
</script>

<template>
  <view class="source-building-page">
    <template v-if="game.detailId === 'spirit'">
      <view class="source-lianshen-background">
        <view class="source-spirit-orbit" /><view class="source-spirit-orbit inner" /><view
          class="source-spirit-ball"
        >
          <text>神</text>
        </view><GameIcon
          v-for="n in 5"
          :key="n"
          name="lotus"
          :size="55"
          :style="{
            position: 'absolute',
            left: `${225 + Math.sin(n * 1.25) * 180}px`,
            top: `${490 + Math.cos(n * 1.25) * 170}px`,
          }"
        />
      </view>
      <view class="source-lianshen-name">
        {{ spirit.name }}
      </view><view class="source-lianshen-progress">
        <view class="progress-track">
          <view :style="{ width: `${(b.level % 10) * 10}%` }" />
        </view><text>{{ b.level * 100 }}/1000</text>
      </view><button class="source-lianshen-up primary-button" @click="game.upgradeBuilding(b.id)">
        炼神
      </button><text class="source-lianshen-cost">
        消耗:铜贝{{ b.level * 3000 }} 灵液{{ b.level * 50 }}
      </text>
    </template>
    <template v-else-if="game.detailId === 'alchemy'">
      <view class="source-building-paper source-pool-paper">
        <view class="source-building-title">
          灵池
        </view><text class="source-pool-tip">灵花蕴养洞府灵气，每日可采集一次</text><view class="source-pool-grid">
          <button
            v-for="n in 8"
            :key="n"
            :disabled="game.claimed('pool', true)"
            @click="game.claim('pool', { liquid: 300, energy: 500 }, true)"
          >
            <GameIcon name="lotus" :size="76" /><text class="source-pool-name">灵花{{ n }}</text><text>{{ game.claimed('pool', true) ? '已采集' : '采集灵液' }}</text>
          </button>
        </view><text class="source-pool-bonus">洞府灵花收益效果+20%</text>
      </view>
    </template>
    <template v-else-if="game.detailId === 'forge'">
      <view class="source-building-paper">
        <view class="source-building-title">
          练功房
        </view><view class="source-practice-art">
          <GameIcon name="person" :size="190" />
        </view><text class="source-practice-description">{{ b.level }}级练功房</text><view class="source-practice-info">
          <text>道友闭关修行，凝练一身真元</text><text>消耗灵气100，获得修为{{ b.level * 500 }}</text><text>当前修为：{{ game.save.wallet.exp }}</text>
        </view><button class="primary-button source-practice-start" @click="study">
          修炼
        </button>
      </view>
    </template>
    <template v-else-if="game.detailId === 'field'">
      <view class="source-building-paper">
        <view class="source-building-title">
          五行力
        </view><text class="source-root-tip">{{ b.level }}级五行力，每分钟收益{{ b.level * 20 }}点</text><view class="source-root-wheel">
          <view class="root-water">
            <text>{{ game.save.wallet.energy }}</text>
          </view><button
            v-for="(name, index) in roots"
            :key="name"
            :style="{ left: `${anchors[index][0] - 58}px`, top: `${anchors[index][1]}px` }"
            :class="{ selected: root === index }"
            @click="root = index"
          >
            <view>{{ name }}</view><text>{{ b.level }}级{{ name }}系灵根</text>
          </button>
        </view><view class="source-root-current">
          <text>{{ b.level }}级{{ roots[root] }}系灵根</text><text>{{ b.level + 1 }}级{{ roots[root] }}系灵根</text><text>攻击 +{{ b.level * 2 }}%</text><text>攻击 +{{ (b.level + 1) * 2 }}%</text>
        </view><text class="source-root-cost">灵气×{{ b.level * 100 }}</text><button class="primary-button source-root-up" @click="rootUpgrade">
          升级
        </button>
      </view>
    </template>
    <template v-else-if="game.detailId === 'library'">
      <view class="source-building-paper">
        <view class="source-building-title">
          功法
        </view><view class="source-book-tabs">
          <button
            v-for="name in ['金', '木', '水', '火', '土']"
            :key="name"
            :class="{ selected: tab === name || (tab === '炼丹' && name === '金') }"
            @click="tab = name"
          >
            {{ name }}系功法
          </button>
        </view><view class="source-gongfa-list">
          <button v-for="n in 8" :key="n" @click="study">
            <GameIcon name="scroll" :size="72" /><text>
              {{
                ['金刚诀', '长春功', '玄水诀', '离火功', '厚土诀'][n % 5]
              }}
            </text><text>第{{ b.level }}重</text><text>修炼</text>
          </button>
        </view><text class="source-gongfa-hint">修习功法提升上阵道友属性</text>
      </view>
    </template>
    <template v-else>
      <view class="source-building-paper">
        <view class="source-building-title">
          书阁
        </view><view class="source-book-tabs">
          <button
            v-for="name in ['炼丹', '炼器', '丹方', '器方']"
            :key="name"
            :class="{ selected: tab === name }"
            @click="tab = name"
          >
            {{ name }}
          </button>
        </view><template v-if="tab === '丹方' || tab === '器方'">
          <view class="source-gongfa-list">
            <button v-for="n in 8" :key="n" @click="game.notify('已参悟方谱')">
              <GameIcon name="scroll" :size="72" /><text>{{ tab }}·{{ n }}品</text><text>参悟</text>
            </button>
          </view>
        </template><template v-else>
          <text class="source-furnace-label">{{ tab === '炼丹' ? '一品丹炉' : '一品器炉' }}</text><view class="source-furnace">
            <GameIcon :name="tab === '炼丹' ? 'bottle' : 'ore'" :size="210" /><view
              class="furnace-flame"
            />
          </view><view class="source-recipe-line">
            <GameIcon :name="tab === '炼丹' ? 'pill' : 'sword'" :size="55" /><text>
              {{
                tab === '炼丹' ? '聚气丹' : '碧波宝刀'
              }}
            </text><button class="small-button" @click="game.notify('已选用此方谱')">
              选择{{ tab === '炼丹' ? '丹方' : '器方' }}
            </button>
          </view><view class="source-craft-cost">
            <text>当前炼制成功率100%，必定成功</text><text>所需{{ tab === '炼丹' ? '灵草' : '玄铁' }}×5</text><text v-if="game.save.craft">
              {{
                remaining ? `炼制中 ${remaining}秒` : '炼制完成'
              }}
            </text>
          </view><button class="primary-button source-craft-start" @click="craft">
            {{ game.save.craft ? (remaining ? '炼制中' : '领取奖励') : '开始炼制' }}
          </button>
        </template>
      </view>
    </template>
    <button class="source-building-back" aria-label="关闭建筑页面" @click="game.close()">
      返回
    </button>
  </view>
</template>
