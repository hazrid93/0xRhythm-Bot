// priority queue using binary heap (max heap)
// note max element are only guaranteed at root, so there might be value on left side bigger than right
// this is because there are no relation between left and right subtrees
// however correct ordering will be had during dequeuing since we are only getting the root
class PriorityQueue<T extends Track>{
    trackValues: T[];
    constructor(){
        this.trackValues = [];
    }

    enqueue(_element: T){
        this.trackValues.push(_element);
        this.bubbleUp();
    }

    bubbleUp(){
        // get last item index
        let idx = this.trackValues.length - 1;
        //current element(value) of last node/least prio that we recently pushed
        while(idx>0){
            const element: T = this.trackValues[idx];
            let parentIdx = Math.floor((idx-1)/2);
            let parent = this.trackValues[parentIdx];
            // for max heap if element is smaller than or equal to then it is in correct position
            if(element.priority <= parent.priority){ break };
            // if element is greater than immediate parent than we need to keep switching until no more.
            let temp = this.trackValues[parentIdx];// store temporary copy of parent node element.
            this.trackValues[parentIdx] = element; //replace parent with last element.
            this.trackValues[idx] = temp // place back temp parent node copy to last element
            // assign previous parent index to new element index so we can continue checking 
            // next parent if it need to swap.
            idx=parentIdx;
        }
        console.log("values enqueue: " + JSON.stringify(this.trackValues));

    }

    dequeue(){
        // get root value
        const max = this.trackValues[0]
        // get the last element in binary heap.
        const end = this.trackValues.pop();
        if (this.trackValues.length > 0){
            // replace last element to root(highest priority)
            this.trackValues[0] = end;
            // corrects the ordering binary heap to max heap rules.
            this.sinkDown();
        }
        console.log("values dequeue: " + JSON.stringify(max));
        return max;
    }

    sinkDown(){
        let idx = 0;
        const length: number = this.trackValues.length;
        
        while(true){
            let element: T = this.trackValues[idx];// get the current root (the one just got replaced)
            let leftChildIdx: number = (2 * idx) + 1;// get left child formula
            let rightChildIdx: number = (2 * idx) + 2;// get right child formula
            let leftChildValue: T;
            let rightChildValue: T;
            let swapIdx: number = null;// temp index variable since there are two child to compare when going down

            if(leftChildIdx < length){//<length is just a array boundary check
                leftChildValue = this.trackValues[leftChildIdx];
                // if left child is bigger than continue swapping since max heap requires root to be biggest
                if(leftChildValue.priority > element.priority) {
                    swapIdx = leftChildIdx;
                }
            }
            if(rightChildIdx < length){//<length is just a array boundary check
                rightChildValue = this.trackValues[rightChildIdx];
                // if right child is bigger than continue swapping since max heap requires root to be biggest
                // also compare with left child to see whos bigger.
                if((swapIdx == null && rightChildValue.priority > element.priority) || 
                    (swapIdx != null && rightChildValue.priority > leftChildValue.priority)) {
                        swapIdx = rightChildIdx;
                } 
            }
            if(swapIdx == null){ break };// complete condition if no swap are needed
            let temp = this.trackValues[idx];
            this.trackValues[idx] = this.trackValues[swapIdx];// finally do the swapping, replace root with child value
            this.trackValues[swapIdx] = temp;
            idx = swapIdx;//bring root index to child index and continue while loop.
        }
    }
}

class Track{
    priority:TrackPriority;
    title:string;
    constructor(_title:string, _priority:TrackPriority){
        this.priority = _priority;
        this.title = _title;
    }
}

enum TrackPriority {
    LOW = 0,
    MEDIUM = 1,
    HIGH = 2
}


let track6 = new Track("amza", TrackPriority.LOW);
let track7 = new Track("xsai", TrackPriority.MEDIUM);
let track1 = new Track("sheila", TrackPriority.LOW);
let track8 = new Track("2sheila", TrackPriority.LOW);
let track4 = new Track("mozart", TrackPriority.MEDIUM);
let track2 = new Track("daiyan", TrackPriority.LOW);
let track3 = new Track("greenday", TrackPriority.HIGH);

let priorityQueue = new PriorityQueue();
priorityQueue.enqueue(track1);
priorityQueue.enqueue(track2);
priorityQueue.enqueue(track3);
priorityQueue.enqueue(track4);
priorityQueue.enqueue(track7);
priorityQueue.dequeue();
priorityQueue.dequeue();
priorityQueue.dequeue();
priorityQueue.dequeue();
priorityQueue.dequeue();
/*
priorityQueue.enqueue(track6);
priorityQueue.enqueue(track8);
priorityQueue.enqueue(track6);
//priorityQueue.dequeue();
//priorityQueue.dequeue();
*/