<template>
    <div class="scroller" ref="scroller">
        <div class="scroller__wrapper">
            <div v-if="pullDown"
                 class="scroller__pull-down"
                 :class="{ loading: loadingDown, pending: pendingDown }"
                 :style="[pullDownStyle, { marginTop: `-${loadingDown || pendingDown ? 0 : pullDownOffset }px`}]">
                <slot name="pull-down"
                      :loading="loadingDown"
                      :pending="pendingDown">
                    <span class="pull-down__label"
                          v-html="labelDown"></span>
                </slot>
            </div>
            <div class="scroller__content">
                <slot></slot>
            </div>
            <div v-if="pullUp"
                 class="scroller__pull-up"
                 :class="{ loading: loadingUp, pending: pendingUp }">
                <slot name="pull-up"
                      :loading="loadingUp"
                      :pending="pendingUp">
                    <span class="pull-up__label"
                          v-html="labelUp"></span>
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
        pullDown: [Function, Boolean],
        pullUp: [Function, Boolean],
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
        pullDownNormal: {
            type: String,
            default: '下拉刷新'
        },
        pullDownRelease: {
            type: String,
            default: '释放刷新'
        },
        pullDownLoading: {
            type: String,
            default: '正在刷新'
        },
        pullUpNormal: {
            type: String,
            default: '上拉加载'
        },
        pullUpRelease: {
            type: String,
            default: '释放加载'
        },
        pullUpLoading: {
            type: String,
            default: '正在加载'
        },
        pullUpEnd: {
            type: String,
            default: '暂无更多'
        },
        scrollbars: {
            type: Boolean,
            default: true
        },
        // 是否实时触发下拉事件，预留
        pullDownImmediate: Boolean,
        // 是否实时触发上拉事件
        pullUpImmediate: Boolean
    },
    data() {
        return {
            pullDownStyle: {},

            labelDown: '',
            labelUp: '',

            loadingDown: false,
            loadingUp: false,
            pendingDown: false,
            pendingUp: false,

            scrollStartPos: 0,

            isEnd: false
        }
    },
    watch: {
        value: {
            immediate: true,
            handler(value) {
                this.$nextTick(() => this.render());
                // 初始化数据时候初始化label
                this.labelDown = this.pullDownNormal;
                if (value) {
                    this.labelUp = this.pullUpImmediate ? this.pullUpLoading : this.pullUpNormal
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
                    if (self.pullDown && self.loadingDown) {
                        self.loadingDown = false;
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
                    if (self.pullUp && self.loadingUp) {
                        self.loadingUp = false;
                        self.labelUp = self.isEnd ? self.pullUpEnd : self.pullUpNormal
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
                                && (((!self.pullUp) && (!self.pendingDown) && (this.y < 0))
                                    || ((!self.pullDown) && (!self.pendingUp) && (this.y > 0)))) {
                            this.hasVerticalScroll = false;
                            self.scrollStartPos = 0;
                            this.scrollBy(0, -this.y, 0)
                        }
                    }

                    if (self.pullDown) {
                        if (this.y > self.pullDownOffset + self.pullThreshold && !self.pendingDown) {
                            self.pendingDown = true;
                            this.scrollBy(0, -self.pullDownOffset, 0);
                            self.labelDown = self.pullDownRelease
                        } else if (this.y < 0 && self.pendingDown) {
                            self.pendingDown = false;
                            self.hidePullDown(0, false);
                            this.scrollBy(0, self.pullDownOffset, 0);
                            self.labelDown = self.pullDownNormal
                        }
                    }
                    if (self.pullUp && !self.isEnd && !self.pullUpImmediate) {
                        if (this.y < this.maxScrollY - self.pullThreshold && !self.pendingUp) {
                            self.pendingUp = true;
                            self.labelUp = self.pullUpRelease
                        } else if (this.y > this.maxScrollY + self.pullThreshold && self.pendingUp) {
                            self.pendingUp = false;
                            self.labelUp = self.pullUpNormal
                        }
                    }
                });

                self.scroller.on('scrollEnd', function () {
                    if (self.pullDown && self.pendingDown) {
                        self.doPullDown()
                    }
                    if (self.pullUp && !self.isEnd && (self.pendingUp || (self.pullUpImmediate && this.y < this.maxScrollY + self.pullDownOffset))) {
                        self.doPullUp()
                    }
                    if (self.scrollStartPos === -1000) {
                        this.hasVerticalScroll = this.options.scrollY && this.maxScrollY < 0
                    }
                })
            } else {
                this.refresh()
            }
        },
        hidePullDown(time, refresh) {
            this.pullDownStyle.transitionDuration = (time > 0 ? `${time}ms` : '');
            if (refresh) {
                setTimeout(() => {
                    this.refresh();
                    this.labelDown = this.pullDownNormal;
                    this.pullDownStyle.transitionDuration = ''
                }, time + 10);
            }
        },
        doPullDown() {
            if (this.pullDown && !this.loadingDown) {
                this.pendingDown = false;
                this.loadingDown = true;
                this.labelDown = this.pullDownLoading;
                if (typeof this.pullDown === 'function') {
                    this.pullDown(this.end)
                }
                this.$emit('pull-down', this.end)
            }
        },
        doPullUp() {
            if (this.pullUp && !this.loadingUp) {
                this.pendingUp = false;
                this.loadingUp = true;
                this.labelUp = this.pullUpLoading;
                if (typeof this.pullUp === 'function') {
                    this.pullUp(this.end)
                }
                this.$emit('pull-up', this.end)
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
        height: 100%;
        overflow: hidden;
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
