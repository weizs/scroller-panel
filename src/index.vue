<template>
    <div class="scroller" ref="scroller">
        <div class="scroller__wrapper">
            <div v-if="pullDown"
                 class="scroller__pull-down"
                 :class="{ loading: loading.down, pending: pending.down }"
                 :style="[pullDownStyle, { marginTop: `-${loading.down || pending.down ? 0 : pullDownOffset }px`}]">
                <slot name="pull-down"
                      :loading="loading.down"
                      :pending="pending.down">
                    <span class="pull-down__label"
                          v-html="label.down"></span>
                </slot>
            </div>
            <div class="scroller__content">
                <slot></slot>
            </div>
            <div v-if="pullUp"
                 class="scroller__pull-up"
                 :class="{ loading: loading.up, pending: pending.up }">
                <slot name="pull-up"
                      :loading="loading.up"
                      :pending="pending.up">
                    <span class="pull-up__label"
                          v-html="label.up"></span>
                </slot>
            </div>
        </div>
    </div>
</template>

<script>
import IScroll from 'iscroll/build/iscroll-probe'

export default {
    name: 'ScrollerPanel',
    props: {
        value: {},
        config: Object,
        pullDown: Function,
        pullUp: Function,
        pullThreshold: {
            type: Number,
            default: 5
        },
        topOffset: {
            type: Number,
            default: 45
        },
        bottomOffset: {
            type: Number,
            default: 45
        },
        pullDownTip: {
            type: Object,
            default() {
                return {
                    normal: '下拉刷新',
                    release: '释放刷新',
                    loading: '正在刷新'
                }
            }
        },
        pullUpTip: {
            type: Object,
            default() {
                return {
                    normal: '上拉加载',
                    release: '释放加载',
                    loading: '正在加载',
                    end: '暂无更多'
                }
            }
        },
        scrollbars: {
            type: Boolean,
            default: true
        },
        // 预留
        pullDownImmediate: Boolean,
        pullUpImmediate: Boolean
    },
    data() {
        return {
            pullDownStyle: {},
            label: {
                down: '',
                up: ''
            },
            loading: {
                down: false,
                up: false
            },
            pending: {
                down: false,
                up: false
            },
            scrollStartPos: 0,
            isEnd: false
        }
    },
    watch: {
        value: {
            immediate: true,
            handler(value) {
                this.$nextTick(() => this.render());
                this.label.down = this.pullDownTip.normal;
                if (value) {
                    this.label.up = this.pullUpTip.normal
                }
            }
        }
    },
    computed: {
        pullDownOffset() {
            return this.topOffset / 37.5 * window.rem
        },
        pullUpOffset() {
            return this.bottomOffset / 37.5 * window.rem
        },
        scrollerCfg() {
            return {
                probeType: 2,
                bounceTime: 250,
                bounceEasing: 'quadratic',
                mouseWheel: false,
                scrollbars: this.scrollbars,
                fadeScrollbars: true,
                interactiveScrollbars: false,
                ...this.config
            }
        }
    },
    methods: {
        refresh() {
            if (this.scroller) {
                this.$nextTick(() => {
                    this.scroller.refresh()
                })
            }
        },
        render() {
            const self = this;
            if (!self.scroller && self.$refs.scroller) {
                self.scroller = new IScroll(self.$refs.scroller, this.scrollerCfg);

                self.scroller.on('refresh', function () {
                    if (self.pullDown && self.loading.down) {
                        self.loading.down = false;
                        if (this.y >= 0) {
                            self.hidePullDown(250, true)
                        } else if (this.y > -self.pullDownOffset) {
                            self.pullDownStyle.marginTop = `${this.y}px`;
                            const animateTime = (250 * (self.pullDownOffset + this.y) / self.pullDownOffset);
                            this.scrollTo(0, 0, 0);
                            setTimeout(() => {
                                self.hidePullDown(animateTime, true)
                            }, 0);
                        } else {
                            self.hidePullDown(0, true);
                            this.scrollBy(0, self.pullDownOffset, 0)
                        }
                    }
                    if (self.pullUp && self.loading.up) {
                        self.loading.up = false;
                        if (self.isEnd) {
                            self.label.up = self.pullUpTip.end
                        } else {
                            self.label.up = self.pullUpTip.normal
                        }
                    }
                });

                self.scroller.on('scrollStart', function () {
                    self.scrollStartPos = this.y
                });

                self.scroller.on('scroll', function () {
                    if (self.pullDown || self.pullUp) {
                        if ((self.scrollStartPos === 0) && (this.y === 0)) {
                            this.hasVerticalScroll = true;
                            self.scrollStartPos = -1000;
                        } else if ((self.scrollStartPos === -1000)
                                && (((!self.pullUp) && (!self.pending.down) && (this.y < 0))
                                    || ((!self.pullDown) && (!self.pending.up) && (this.y > 0)))) {
                            this.hasVerticalScroll = false;
                            self.scrollStartPos = 0;
                            this.scrollBy(0, -this.y, 0)
                        }
                    }

                    if (self.pullDown) {
                        if (this.y > self.pullDownOffset + self.pullThreshold && !self.pending.down) {
                            self.pending.down = true;
                            this.scrollBy(0, -self.pullDownOffset, 0);
                            self.label.down = self.pullDownTip.release
                        } else if (this.y < 0 && self.pending.down) {
                            self.pending.down = false;
                            self.hidePullDown(0, false);
                            this.scrollBy(0, self.pullDownOffset, 0);
                            self.label.down = self.pullDownTip.normal
                        }
                    }
                    if (self.pullUp && !self.isEnd) {
                        if (this.y < (this.maxScrollY - (self.pullUpImmediate ? 0 : self.pullThreshold) + (self.pullUpImmediate ? self.pullDownOffset : 0)) && !self.pending.up) {
                            if (self.pullUpImmediate) {
                                self.doPullUp()
                            } else {
                                self.pending.up = true;
                                self.label.up = self.pullUpTip.release
                            }
                        } else if (this.y > (this.maxScrollY + self.pullThreshold) && self.pending.up) {
                            self.pending.up = false;
                            self.label.up = self.pullUpTip.normal
                        }
                    }
                });

                self.scroller.on('scrollEnd', function () {
                    if (self.pullDown && self.pending.down) {
                        self.pending.down = false;
                        self.doPullDown()
                    }
                    if (self.pullUp && self.pending.up) {
                        self.pending.up = false;
                        self.doPullUp()
                    }
                    if (self.scrollStartPos === -1000) {
                        this.hasVerticalScroll = this.options.scrollY && this.maxScrollY < 0
                    }
                });
            } else {
                this.refresh()
            }
        },
        hidePullDown(time, refresh) {
            this.pullDownStyle.transitionDuration = (time > 0 ? `${time}ms` : '');
            if (refresh) {
                setTimeout(() => {
                    this.refresh();
                    this.label.down = this.pullDownTip.normal;
                    this.pullDownStyle.transitionDuration = ''
                }, time + 10);
            }
        },
        doPullDown() {
            if (this.pullDown && !this.loading.down) {
                this.loading.down = true;
                this.label.down = this.pullDownTip.loading;
                this.pullDown(this.end)
            }
        },
        doPullUp() {
            if (this.pullUp && !this.loading.up) {
                this.loading.up = true;
                this.label.up = this.pullUpTip.loading;
                this.pullUp(this.end)
            }
        },
        end(isEnd) {
            this.isEnd = !!isEnd;
            this.refresh()
        }
    }
}
</script>

<style lang="less" scoped>
    .scroller {
        touch-action: pan-x pinch-zoom;
        &__wrapper {
            position: absolute;
            width: 100%;
        }
    }
    .pull-down__label,
    .pull-up__label {
        display: block;
        height: 45px;
        line-height: 45px;
        text-align: center;
    }
</style>
