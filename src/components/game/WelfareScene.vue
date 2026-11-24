<script setup lang="ts">
import { computed, ref } from 'vue'
import { WELFARE_TABS } from '@/api/mock'
import { useGameStore } from '@/store/game'
import GameIcon from './GameIcon.vue'

const props = defineProps<{ initialTab?: string }>()
const game = useGameStore()
const tab = ref(props.initialTab || '每日签到')
const loginDays = computed(() =>
  Math.max(
    1,
    Math.floor(
      (Date.parse(game.save.day)
        - Date.parse(new Date(game.save.createdAt + 28800000).toISOString().slice(0, 10)))
      / 86400000,
    ) + 1,
  ),
)
function simulatedPurchase(key: string, cost: number): void {
  if (game.claimed(key)) {
    game.notify('已领取此礼包')
    return
  }
  if (game.spend({ jade: cost }))
    game.claim(key, { exp: cost * 12, coin: cost * 50 })
}
</script>

<template>
  <view class="module-page welfare-scene">
    <view class="welfare-layout">
      <view class="welfare-tabs">
        <button
          v-for="name in WELFARE_TABS"
          :key="name"
          :class="{ selected: tab === name }"
          @click="tab = name"
        >
          {{ name }}
        </button>
      </view>
      <view class="welfare-content">
        <view class="welfare-banner">
          <view>{{ tab }}</view><text>
            {{
              ['首充豪礼', '月卡', '每日礼包'].includes(tab)
                ? '模拟兑换 · 使用仙玉领取'
                : '仙途有礼，福泽长伴'
            }}
          </text><GameIcon name="gift" :size="90" />
        </view>
        <template v-if="tab === '每日签到'">
          <view class="muted text-center">
            今日仙历：{{ game.save.day }}
          </view><view class="sign-grid">
            <button
              v-for="n in 30"
              :key="n"
              :class="{
                selected: n === new Date(game.now + 28800000).getUTCDate(),
                received: game.claimed(`sign-${n}`, true),
              }"
              :disabled="
                n !== new Date(game.now + 28800000).getUTCDate() || game.claimed(`sign-${n}`, true)
              "
              @click="game.claim(`sign-${n}`, { jade: 100, coin: 3000 }, true)"
            >
              <text>{{ n }}日</text><GameIcon :name="n % 5 ? 'jade' : 'gift'" :size="45" /><text>
                {{ game.claimed(`sign-${n}`, true) ? '已领' : n % 5 ? '100' : '礼包' }}
              </text>
            </button>
          </view><view class="muted text-center">
            点击今日日期签到
          </view>
        </template>
        <template v-else-if="tab === '七日登录'">
          <view v-for="n in 7" :key="n" class="welfare-row">
            <view>
              <text>第 {{ n }} 天</text><view class="muted">
                仙玉 ×{{ n * 100 }}
              </view>
            </view><button
              class="small-button"
              :disabled="n > loginDays || game.claimed(`login-${n}`)"
              @click="game.claim(`login-${n}`, { jade: n * 100, exp: n * 500 })"
            >
              {{ game.claimed(`login-${n}`) ? '已领取' : n > loginDays ? '未到时间' : '领取' }}
            </button>
          </view>
        </template>
        <template v-else-if="tab === '在线奖励'">
          <view class="muted text-center">
            本地累计在线 {{ Math.floor(game.save.played / 60) }} 分钟
          </view><view v-for="n in [1, 3, 5, 10, 30]" :key="n" class="welfare-row">
            <view>
              在线 {{ n }} 分钟<view class="muted">
                修为 ×{{ n * 200 }}
              </view>
            </view><button
              class="small-button"
              :disabled="game.save.played < n * 60 || game.claimed(`online-${n}`, true)"
              @click="game.claim(`online-${n}`, { exp: n * 200, coin: n * 500 }, true)"
            >
              {{
                game.claimed(`online-${n}`, true)
                  ? '已领取'
                  : game.save.played < n * 60
                    ? '未达成'
                    : '领取'
              }}
            </button>
          </view>
        </template>
        <template v-else-if="tab === '成长基金'">
          <view v-for="n in [1, 5, 10, 20, 30]" :key="n" class="welfare-row">
            <view>
              通关第 {{ n }} 关<view class="muted">
                仙玉 ×{{ n * 50 }}
              </view>
            </view><button
              class="small-button"
              :disabled="game.save.cleared < n || game.claimed(`fund-${n}`)"
              @click="game.claim(`fund-${n}`, { jade: n * 50 })"
            >
              {{ game.claimed(`fund-${n}`) ? '已领取' : '领取' }}
            </button>
          </view>
        </template>
        <template v-else-if="tab === '祈福' || tab === '幸运转盘'">
          <view class="fortune-wheel">
            <view class="fortune-center">
              <GameIcon :name="tab === '祈福' ? 'lotus' : 'jade'" :size="100" /><text>
                {{ tab === '祈福' ? '福' : '缘' }}
              </text>
            </view><text class="fortune-one">仙玉</text><text class="fortune-two">修为</text><text class="fortune-three">铜贝</text>
          </view><view class="fortune-description">
            {{ tab === '祈福' ? '心诚则灵，福至仙来' : '转动仙缘，寻觅机遇' }}
          </view><button class="primary-button centered" @click="game.spin()">
            {{ tab === '祈福' ? '祈福一次' : '转动一次' }}
          </button><view class="muted mt-4 text-center">
            消耗仙玉 50 · 每次随机获得一项奖励
          </view><button class="text-btn centered" @click="game.open('probability')">
            查看奖励概率
          </button>
        </template>
        <template v-else>
          <view class="purchase-gift">
            <GameIcon name="gift" :size="130" /><view>
              {{
                tab === '月卡'
                  ? '月华长伴，仙途无忧'
                  : tab === '首充豪礼'
                    ? '初踏仙途，助力成长'
                    : '每日一礼，积少成多'
              }}
            </view><view class="muted">
              此演示使用仙玉兑换，无真实支付
            </view>
          </view><view class="reward-tile">
            <GameIcon name="pill" :size="60" /><text>修为 ×1200</text><GameIcon name="coin" :size="60" /><text>铜贝 ×5000</text>
          </view><button
            class="primary-button centered"
            :disabled="game.claimed(`purchase-${tab}`)"
            @click="simulatedPurchase(`purchase-${tab}`, 100)"
          >
            {{ game.claimed(`purchase-${tab}`) ? '已领取' : '100 仙玉兑换' }}
          </button>
        </template>
      </view>
    </view>
  </view>
</template>
